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
import { createClient } from "@/lib/supabase/server";
import {
  type AiClonePlan,
  getAiClonePriceId,
  getSiteOrigin,
  getStripeClient,
} from "@/lib/stripe/client";

async function startAiCloneCheckout(plan: AiClonePlan): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/services/ai")}`);
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
      cancel_url: `${origin}/services/ai`,
      allow_promotion_codes: true,
      locale: "ja",
    },
    { idempotencyKey: `checkout:ai-clone:${plan}:${user.id}:${today}` },
  );

  if (!session.url) {
    throw new Error("Checkout Session の作成に失敗しました");
  }

  redirect(session.url);
}

export async function startAiCloneAssistant(): Promise<never> {
  return startAiCloneCheckout("assistant");
}

export async function startAiClonePartner(): Promise<never> {
  return startAiCloneCheckout("partner");
}
