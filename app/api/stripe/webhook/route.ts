// Stripe Webhook ハンドラ。
//
// 対応イベント:
//   checkout.session.completed       → tier='paid' へ昇格、stripe_*_id 保存
//   customer.subscription.updated    → subscription_status 反映
//   customer.subscription.deleted    → tier='tentative' へ revert
//   invoice.payment_succeeded        → subscription_status='active' に確定
//   invoice.payment_failed           → subscription_status='past_due' に
//
// セキュリティ:
//   - 必ず stripe-signature を検証
//   - service_role key で RLS を越えて UPDATE
//   - event.id を stripe_webhook_events.id に INSERT して冪等化
//
// 開発時のセットアップ:
//   stripe listen --forward-to localhost:3000/api/stripe/webhook
//   出力された whsec_xxx を STRIPE_WEBHOOK_SECRET に設定
//
// ルックアップ戦略:
//   subscription / invoice 系イベントは sub.metadata.applicant_id を最優先で使う。
//   無い場合は customer_id をフォールバックに使う（既存のレガシーな customer 用）。

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getStripeClient, getWebhookSecret } from "@/lib/stripe/client";

// raw body で受け取る必要があるため Node.js runtime
export const runtime = "nodejs";

// service role を使う管理クライアント（webhook は server-to-server で RLS 越え）
function adminSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service role が未設定。NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** subscription / invoice の metadata から applicant_id を引く */
async function applicantIdFromSubscription(
  stripe: Stripe,
  sub: Stripe.Subscription,
): Promise<string | null> {
  if (sub.metadata?.applicant_id) return sub.metadata.applicant_id;
  return null;
}

async function applicantIdFromInvoice(
  stripe: Stripe,
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<string | null> {
  // 1. parent.subscription_details.subscription があれば（API v2024+ の subscription invoice）
  //    そこから subscription を retrieve して metadata.applicant_id を取る
  const subId =
    invoice.parent?.subscription_details?.subscription ?? null;
  const subIdStr =
    typeof subId === "string" ? subId : subId?.id ?? null;
  if (subIdStr) {
    try {
      const sub = await stripe.subscriptions.retrieve(subIdStr);
      if (sub.metadata?.applicant_id) return sub.metadata.applicant_id;
    } catch {
      // fall through to customer-based lookup
    }
  }
  // 2. フォールバック: invoice.customer から DB で applicant を引く
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;
  if (customerId) {
    return applicantIdFromCustomerId(supabase, customerId);
  }
  return null;
}

/** customer_id でも applicant を引けるフォールバック */
async function applicantIdFromCustomerId(
  supabase: SupabaseClient,
  customerId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("applicants")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "signature missing" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, getWebhookSecret());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[stripe.webhook] signature verification failed", { msg });
    return NextResponse.json(
      { error: `signature verification failed: ${msg}` },
      { status: 400 },
    );
  }

  const supabase = adminSupabase();

  // ─── 冪等性チェック ─────────────────────────────────────────────
  // event.id を PK に INSERT。duplicate key なら処理スキップ。
  const { error: insertErr } = await supabase
    .from("stripe_webhook_events")
    .insert({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
    });

  if (insertErr) {
    // 23505 = unique_violation（PostgreSQL）。再送なので何もせず 200 を返す。
    if (insertErr.code === "23505") {
      console.warn("[stripe.webhook] duplicate event, skipping", {
        id: event.id,
        type: event.type,
      });
      return NextResponse.json({ received: true, deduped: true });
    }
    console.error("[stripe.webhook] failed to record event", {
      id: event.id,
      err: insertErr.message,
    });
    return NextResponse.json(
      { error: `failed to record event: ${insertErr.message}` },
      { status: 500 },
    );
  }

  try {
    switch (event.type) {
      // ─── 決済成功（初回） ───────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const applicantId = session.metadata?.applicant_id;
        if (!applicantId) {
          console.warn("[stripe.webhook] checkout.session.completed without applicant_id", {
            id: event.id,
          });
          break;
        }
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null);
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? null);

        const { error } = await supabase
          .from("applicants")
          .update({
            tier: "paid",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
          })
          .eq("id", applicantId);
        if (error) throw error;
        console.info("[stripe.webhook] applicant upgraded to paid", {
          applicantId,
          customerId,
          subscriptionId,
        });
        break;
      }

      // ─── サブスク更新（status 変化を反映） ─────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const applicantId =
          (await applicantIdFromSubscription(stripe, sub)) ??
          (await applicantIdFromCustomerId(
            supabase,
            typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          ));
        if (!applicantId) {
          console.warn("[stripe.webhook] subscription.updated could not resolve applicant", {
            id: event.id,
            subId: sub.id,
          });
          break;
        }
        const { error } = await supabase
          .from("applicants")
          .update({
            subscription_status: sub.status,
            stripe_subscription_id: sub.id,
            stripe_customer_id:
              typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          })
          .eq("id", applicantId);
        if (error) throw error;
        // ※ tier の自動 downgrade は今は行わない（past_due は猶予扱い）
        break;
      }

      // ─── サブスク解約（tier を tentative に戻す） ───────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const applicantId =
          (await applicantIdFromSubscription(stripe, sub)) ??
          (await applicantIdFromCustomerId(
            supabase,
            typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          ));
        if (!applicantId) {
          console.warn("[stripe.webhook] subscription.deleted could not resolve applicant", {
            id: event.id,
            subId: sub.id,
          });
          break;
        }
        const { error } = await supabase
          .from("applicants")
          .update({
            tier: "tentative",
            subscription_status: "canceled",
          })
          .eq("id", applicantId);
        if (error) throw error;
        console.info("[stripe.webhook] applicant downgraded to tentative", {
          applicantId,
          subId: sub.id,
        });
        break;
      }

      // ─── 月次請求成功 ────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const applicantId = await applicantIdFromInvoice(stripe, supabase, invoice);
        if (!applicantId) break;
        const { error } = await supabase
          .from("applicants")
          .update({ subscription_status: "active" })
          .eq("id", applicantId);
        if (error) throw error;
        break;
      }

      // ─── 月次請求失敗 ────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const applicantId = await applicantIdFromInvoice(stripe, supabase, invoice);
        if (!applicantId) break;
        const { error } = await supabase
          .from("applicants")
          .update({ subscription_status: "past_due" })
          .eq("id", applicantId);
        if (error) throw error;
        console.warn("[stripe.webhook] invoice.payment_failed", {
          applicantId,
          invoiceId: invoice.id,
        });
        break;
      }

      default:
        // 他のイベントは無視
        break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("[stripe.webhook] handler failed", {
      id: event.id,
      type: event.type,
      err: msg,
    });
    // 5xx を返すと Stripe は再送する。冪等テーブルが守るので OK。
    return NextResponse.json(
      { error: `handler failed: ${msg}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
