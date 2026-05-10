// Stripe Checkout Session を作成し、その URL を返す。
// クライアント側は受け取った url に window.location.href で遷移するだけ。
//
// 認証必須：仮登録(tentative)済みの applicant が前提。
// 既に paid なら早期 return（重複サブスク防止）。
// stripe_customer_id を再利用（既存顧客なら同一 customer に紐付け）。
//
// 成功時は `/upgrade/success?session_id=...` に戻る。
// キャンセル時は `/upgrade` に戻る。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getSalonPriceId,
  getSiteOrigin,
  getStripeClient,
} from "@/lib/stripe/client";

export async function POST() {
  const supabase = await createClient();

  // 認証
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ログインが必要です" },
      { status: 401 },
    );
  }

  // applicant 取得（既存の stripe_customer_id を再利用するため）
  const { data: applicant, error: aErr } = await supabase
    .from("applicants")
    .select("id, name, tier, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (aErr || !applicant) {
    return NextResponse.json(
      { error: "ユーザー情報を取得できません" },
      { status: 400 },
    );
  }

  if (applicant.tier === "paid") {
    return NextResponse.json(
      { error: "既にサロン本会員です" },
      { status: 400 },
    );
  }

  const stripe = getStripeClient();
  const priceId = getSalonPriceId();
  const origin = getSiteOrigin();

  // 連打や retry で重複 Session を作らないよう、決定的な Idempotency-Key を渡す。
  // user.id + 当日日付 で十分（同じユーザーが同じ日に何度叩いても同じ Session が返る）。
  const today = new Date().toISOString().slice(0, 10);
  const idempotencyKey = `checkout:${applicant.id}:${today}`;

  // session_id をクエリで戻すと、success ページで session を verify できる
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // 既存 customer_id があれば再利用、無ければ Checkout 内で新規発行
      ...(applicant.stripe_customer_id
        ? { customer: applicant.stripe_customer_id }
        : { customer_email: user.email ?? undefined }),
      // applicant_id を metadata に乗せて、webhook で誰の決済か紐付ける
      metadata: { applicant_id: applicant.id },
      subscription_data: {
        metadata: { applicant_id: applicant.id },
      },
      success_url: `${origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade`,
      allow_promotion_codes: true,
      locale: "ja",
    },
    { idempotencyKey },
  );

  if (!session.url) {
    return NextResponse.json(
      { error: "Checkout Session の作成に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
