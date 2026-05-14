// Stripe Webhook ハンドラ。
//
// 対応イベント（サロン = applicants 軸）:
//   checkout.session.completed       → tier='paid' へ昇格、stripe_*_id 保存
//   customer.subscription.updated    → subscription_status 反映
//   customer.subscription.deleted    → tier='tentative' へ revert
//   invoice.payment_succeeded        → subscription_status='active' に確定
//   invoice.payment_failed           → subscription_status='past_due' に
//
// 対応イベント（AI Clone = ai_clone_tenants 軸）:
//   checkout.session.completed       → ai_clone_tenants + tenant_members(owner) 自動作成
//   customer.subscription.updated    → ai_clone_tenants.subscription_status 反映
//   customer.subscription.deleted    → ai_clone_tenants.status='terminated' / subscription_status='canceled'
//   invoice.payment_succeeded/failed → ai_clone_tenants.subscription_status 反映
//
// 分岐ルール:
//   session.metadata.purpose === 'ai-clone'  → AI Clone 処理
//   sub.metadata.purpose === 'ai-clone'       → AI Clone 処理
//   それ以外（applicant_id がある or 何もない）→ サロン処理（既存）
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
//   subscription / invoice 系イベントは sub.metadata.applicant_id / user_id を最優先で使う。
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

// ─── AI Clone 用ヘルパー ────────────────────────────────────────

/** 衝突しない slug を生成（t-<8桁hex>）。5回リトライで失敗時は例外 */
async function generateUniqueCloneSlug(
  supabase: SupabaseClient,
): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const short = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const slug = `t-${short}`;
    const { data } = await supabase
      .from("ai_clone_tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
  }
  throw new Error("ユニークな AI Clone slug を生成できませんでした（5回試行）");
}

/**
 * subscription の metadata.purpose==='ai-clone' から ai_clone_tenants.id を引く。
 * 1. stripe_subscription_id 一致
 * 2. metadata.user_id で owner_user_id 一致
 * 3. stripe_customer_id 一致
 * の順でフォールバック。
 */
async function aiCloneTenantIdFromSubscription(
  supabase: SupabaseClient,
  sub: Stripe.Subscription,
): Promise<string | null> {
  // 1. subscription_id 一致
  const { data: bySubId } = await supabase
    .from("ai_clone_tenants")
    .select("id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (bySubId?.id) return bySubId.id as string;

  // 2. metadata.user_id で owner_user_id 一致
  const userId = sub.metadata?.user_id;
  if (userId) {
    const { data: byOwner } = await supabase
      .from("ai_clone_tenants")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (byOwner?.id) return byOwner.id as string;
  }

  // 3. customer_id 一致
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  if (customerId) {
    const { data: byCustomer } = await supabase
      .from("ai_clone_tenants")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (byCustomer?.id) return byCustomer.id as string;
  }

  return null;
}

/** invoice 経由で subscription を retrieve し、ai-clone tenant を引く */
async function aiCloneTenantIdFromInvoice(
  stripe: Stripe,
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const subId = invoice.parent?.subscription_details?.subscription ?? null;
  const subIdStr = typeof subId === "string" ? subId : subId?.id ?? null;
  if (!subIdStr) {
    // subscription なしの invoice（one-time）は AI Clone 範囲外
    return null;
  }
  try {
    const sub = await stripe.subscriptions.retrieve(subIdStr);
    if (sub.metadata?.purpose !== "ai-clone") return null;
    return aiCloneTenantIdFromSubscription(supabase, sub);
  } catch {
    return null;
  }
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
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : (session.subscription?.id ?? null);
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? null);

        // ─ AI Clone 用分岐：ai_clone_tenants + tenant_members(owner) 自動作成 ─
        if (session.metadata?.purpose === "ai-clone") {
          const userId = session.metadata?.user_id;
          const plan = session.metadata?.plan;
          if (!userId || !plan) {
            console.warn(
              "[stripe.webhook] ai-clone checkout missing user_id / plan metadata",
              { id: event.id },
            );
            break;
          }

          // 既に owner として tenant を持っていれば subscription 情報だけ更新（冪等性）
          const { data: existing } = await supabase
            .from("ai_clone_tenants")
            .select("id, slug")
            .eq("owner_user_id", userId)
            .maybeSingle();

          if (existing) {
            const { error: updErr } = await supabase
              .from("ai_clone_tenants")
              .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                subscription_status: "active",
                plan,
              })
              .eq("id", existing.id);
            if (updErr) throw updErr;
            console.info("[stripe.webhook] ai-clone tenant exists, subscription info updated", {
              tenantId: existing.id,
              slug: existing.slug,
            });
            break;
          }

          // 新規作成：slug を自動発行、表示名はメアドの prefix から仮で組む
          const slug = await generateUniqueCloneSlug(supabase);

          let defaultName = "新規テナント";
          try {
            const { data: userResp } = await supabase.auth.admin.getUserById(userId);
            const email = userResp?.user?.email ?? "";
            const prefix = email.split("@")[0];
            if (prefix && prefix.length > 0 && prefix.length <= 50) {
              defaultName = prefix;
            }
          } catch {
            // メアド取得失敗時は fallback の "新規テナント" のまま続行
          }

          const { data: createdTenant, error: tenantErr } = await supabase
            .from("ai_clone_tenants")
            .insert({
              name: defaultName,
              slug,
              owner_user_id: userId,
              plan,
              status: "active",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: "active",
            })
            .select("id, slug")
            .single();

          if (tenantErr || !createdTenant) {
            throw new Error(
              `ai_clone_tenants 作成失敗: ${tenantErr?.message ?? "unknown"}`,
            );
          }

          const { error: memberErr } = await supabase
            .from("ai_clone_tenant_members")
            .insert({
              tenant_id: createdTenant.id,
              user_id: userId,
              role: "owner",
            });

          if (memberErr) {
            // owner 登録に失敗したら tenant もロールバック
            await supabase
              .from("ai_clone_tenants")
              .delete()
              .eq("id", createdTenant.id);
            throw new Error(
              `ai_clone_tenant_members 登録失敗: ${memberErr.message}`,
            );
          }

          console.info("[stripe.webhook] ai-clone tenant provisioned", {
            tenantId: createdTenant.id,
            slug: createdTenant.slug,
            userId,
            plan,
            customerId,
            subscriptionId,
          });

          // 監査ログ（fire-and-forget。失敗してもメイン処理は通す）
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "ai_clone_tenant",
            subject_id: createdTenant.id,
            action: "tenant_provisioned",
            details: {
              stripe_event_id: event.id,
              customer_id: customerId,
              subscription_id: subscriptionId,
              plan,
              slug: createdTenant.slug,
              owner_user_id: userId,
            },
          });
          break;
        }

        // ─ サロン（既存）処理 ─
        const applicantId = session.metadata?.applicant_id;
        if (!applicantId) {
          console.warn("[stripe.webhook] checkout.session.completed without applicant_id", {
            id: event.id,
          });
          break;
        }

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
        // 監査ログ：サブスク開始（fire-and-forget）
        void supabase.from("activity_log").insert({
          actor_id: null,
          subject_type: "applicant",
          subject_id: applicantId,
          action: "subscription_created",
          details: {
            stripe_event_id: event.id,
            customer_id: customerId,
            subscription_id: subscriptionId,
            tier_change: { from: "tentative", to: "paid" },
          },
        });
        break;
      }

      // ─── サブスク更新（status 変化を反映） ─────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        // ─ AI Clone 用分岐 ─
        if (sub.metadata?.purpose === "ai-clone") {
          const tenantId = await aiCloneTenantIdFromSubscription(supabase, sub);
          if (!tenantId) {
            console.warn(
              "[stripe.webhook] ai-clone subscription.updated could not resolve tenant",
              { id: event.id, subId: sub.id },
            );
            break;
          }
          const customerId =
            typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          const { error } = await supabase
            .from("ai_clone_tenants")
            .update({
              subscription_status: sub.status,
              stripe_subscription_id: sub.id,
              stripe_customer_id: customerId,
            })
            .eq("id", tenantId);
          if (error) throw error;
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "ai_clone_tenant",
            subject_id: tenantId,
            action: "subscription_status_change",
            details: {
              stripe_event_id: event.id,
              new_status: sub.status,
              subscription_id: sub.id,
            },
          });
          break;
        }

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
        // 監査ログ：サブスク状態変化
        void supabase.from("activity_log").insert({
          actor_id: null,
          subject_type: "applicant",
          subject_id: applicantId,
          action: "subscription_status_change",
          details: {
            stripe_event_id: event.id,
            new_status: sub.status,
            subscription_id: sub.id,
          },
        });
        // ※ tier の自動 downgrade は今は行わない（past_due は猶予扱い）
        break;
      }

      // ─── サブスク解約（tier を tentative に戻す） ───────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        // ─ AI Clone 用分岐：tenant.status='terminated' + subscription_status='canceled' ─
        if (sub.metadata?.purpose === "ai-clone") {
          const tenantId = await aiCloneTenantIdFromSubscription(supabase, sub);
          if (!tenantId) {
            console.warn(
              "[stripe.webhook] ai-clone subscription.deleted could not resolve tenant",
              { id: event.id, subId: sub.id },
            );
            break;
          }
          const { error } = await supabase
            .from("ai_clone_tenants")
            .update({
              subscription_status: "canceled",
              status: "terminated",
            })
            .eq("id", tenantId);
          if (error) throw error;
          console.info("[stripe.webhook] ai-clone tenant terminated", {
            tenantId,
            subId: sub.id,
          });
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "ai_clone_tenant",
            subject_id: tenantId,
            action: "subscription_canceled",
            details: {
              stripe_event_id: event.id,
              subscription_id: sub.id,
            },
          });
          break;
        }

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
        // 監査ログ：サブスク解約
        void supabase.from("activity_log").insert({
          actor_id: null,
          subject_type: "applicant",
          subject_id: applicantId,
          action: "subscription_canceled",
          details: {
            stripe_event_id: event.id,
            subscription_id: sub.id,
            tier_change: { from: "paid", to: "tentative" },
          },
        });
        break;
      }

      // ─── 月次請求成功 ────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;

        // ─ AI Clone 用分岐 ─
        const aiCloneTenantId = await aiCloneTenantIdFromInvoice(
          stripe,
          supabase,
          invoice,
        );
        if (aiCloneTenantId) {
          const { error } = await supabase
            .from("ai_clone_tenants")
            .update({ subscription_status: "active" })
            .eq("id", aiCloneTenantId);
          if (error) throw error;
          break;
        }

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

        // ─ AI Clone 用分岐 ─
        const aiCloneTenantId = await aiCloneTenantIdFromInvoice(
          stripe,
          supabase,
          invoice,
        );
        if (aiCloneTenantId) {
          const { error } = await supabase
            .from("ai_clone_tenants")
            .update({ subscription_status: "past_due" })
            .eq("id", aiCloneTenantId);
          if (error) throw error;
          console.warn("[stripe.webhook] ai-clone invoice.payment_failed", {
            tenantId: aiCloneTenantId,
            invoiceId: invoice.id,
          });
          void supabase.from("activity_log").insert({
            actor_id: null,
            subject_type: "ai_clone_tenant",
            subject_id: aiCloneTenantId,
            action: "payment_failed",
            details: {
              stripe_event_id: event.id,
              invoice_id: invoice.id,
              amount_due: invoice.amount_due,
              currency: invoice.currency,
            },
          });
          break;
        }

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
        // 監査ログ：請求失敗
        void supabase.from("activity_log").insert({
          actor_id: null,
          subject_type: "applicant",
          subject_id: applicantId,
          action: "payment_failed",
          details: {
            stripe_event_id: event.id,
            invoice_id: invoice.id,
            amount_due: invoice.amount_due,
            currency: invoice.currency,
          },
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
