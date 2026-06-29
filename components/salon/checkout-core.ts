// テラこや 個人会員（¥11,000/月・税込）の Stripe Checkout 起動コア。
// Server Action（actions.ts）と、ログイン後の自動再開ページ（terakoya/start）の
// 両方から使う。AI Clone の checkout-core.ts と同じ思想。
// ※ "use server" は付けない（通常のサーバーモジュール。redirect は next/navigation）。
//
// フロー（「決済前に会員登録」方式）:
//   未ログイン → /login?next=/members/app/terakoya/start へ。登録/ログイン後に
//   自動再開ページへ戻り、再クリック不要で Stripe Checkout に進む。
//   ログイン済み → metadata.user_id 付きで Checkout 作成 → webhook が plan='terakoya' を付与。

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getSiteOrigin,
  getStripeClient,
  getTerakoyaPriceId,
} from "@/lib/stripe/client";

export async function terakoyaCheckoutRedirect(): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 決済前に会員登録：未ログインなら登録/ログインへ送り、完了後に自動再開ページへ戻す。
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent("/members/app/terakoya/start")}`,
    );
  }

  // Stripe 未設定（env 未投入）でも生の500を出さず「準備中」案内に倒す。
  // redirect() は NEXT_REDIRECT を throw するため try の外で呼ぶ。
  let checkoutUrl: string | null = null;
  try {
    const stripe = getStripeClient();
    const priceId = getTerakoyaPriceId();
    const origin = getSiteOrigin();
    const today = new Date().toISOString().slice(0, 10);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: user.email ?? undefined,
        metadata: { purpose: "terakoya", user_id: user.id },
        subscription_data: {
          metadata: { purpose: "terakoya", user_id: user.id },
        },
        success_url: `${origin}/members/app/mypage?checkout=success`,
        cancel_url: `${origin}/members`,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        locale: "ja",
      },
      { idempotencyKey: `checkout:terakoya:${user.id}:${today}` },
    );
    checkoutUrl = session.url ?? null;
  } catch (err) {
    console.error("[terakoya] Checkout 作成失敗（Stripe設定/通信）:", err);
    redirect("/members?checkout=unavailable");
  }

  if (!checkoutUrl) {
    redirect("/members?checkout=unavailable");
  }

  redirect(checkoutUrl);
}
