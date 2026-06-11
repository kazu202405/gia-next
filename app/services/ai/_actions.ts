// AI Clone（アシスタント / パートナー）の Stripe Checkout を起動する Server Action。
// /services/ai LP の料金プランカードから <form action={...}> で呼ぶ前提。
//
// 動作:
//   1. 未ログインなら /login?next=/services/ai へ（一般ユーザー導線。/admin/login は主催者専用）
//   2. 既に active な tenant の owner なら /clone/<slug> へ（重複決済防止）
//   3. それ以外は Stripe Checkout Session を作って session.url へリダイレクト
//
// Webhook 側で session.metadata.purpose==='ai-clone' を見て tenant 自動作成。

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  type AiClonePlan,
  getAiClonePriceId,
  getSiteOrigin,
  getStripeClient,
} from "@/lib/stripe/client";

// 申込ボタンを押した元ページ（/start か /services/ai）に戻すためのパスを Referer から判定。
async function resolveReturnPath(): Promise<string> {
  try {
    const ref = (await headers()).get("referer") || "";
    const p = new URL(ref).pathname;
    if (p === "/start" || p === "/services/ai") return p;
  } catch {
    // 解析失敗時はデフォルト
  }
  return "/services/ai";
}

async function startAiCloneCheckout(plan: AiClonePlan): Promise<never> {
  const returnPath = await resolveReturnPath();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(returnPath)}`);
  }

  // 既に owner として active な tenant を持っていれば、そちらへ
  const { data: existing } = await supabase
    .from("ai_clone_tenants")
    .select("slug, status")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (existing && existing.status === "active") {
    redirect(`/clone/${existing.slug}`);
  }

  // Stripe 設定（secret key / price id / origin）が本番未設定だと throw する。
  // ここで生の 500（server-side exception）を出すと申込導線が完全に死ぬので、
  // 設定不備・Stripe エラーは握って案内ページ（?checkout=unavailable）へ倒す。
  // ※ redirect() は NEXT_REDIRECT を throw するため try の外で呼ぶ（成功時は下で）。
  let checkoutUrl: string | null = null;
  try {
    const stripe = getStripeClient();
    const priceId = getAiClonePriceId(plan);
    const origin = getSiteOrigin();
    const today = new Date().toISOString().slice(0, 10);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email ?? undefined,
        metadata: {
          purpose: "ai-clone",
          user_id: user.id,
          plan,
        },
        subscription_data: {
          metadata: {
            purpose: "ai-clone",
            user_id: user.id,
            plan,
          },
        },
        success_url: `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}&purpose=ai-clone`,
        cancel_url: `${origin}${returnPath}`,
        allow_promotion_codes: true,
        locale: "ja",
      },
      { idempotencyKey: `checkout:ai-clone:${plan}:${user.id}:${today}` },
    );
    checkoutUrl = session.url ?? null;
  } catch (err) {
    console.error("[ai-clone] Checkout 作成失敗（Stripe設定/通信）:", err);
    redirect(`${returnPath}?checkout=unavailable`);
  }

  if (!checkoutUrl) {
    redirect(`${returnPath}?checkout=unavailable`);
  }

  redirect(checkoutUrl);
}

export async function startAiCloneAssistant(): Promise<never> {
  return startAiCloneCheckout("assistant");
}

export async function startAiClonePartner(): Promise<never> {
  return startAiCloneCheckout("partner");
}
