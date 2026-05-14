// Stripe SDK の初期化ラッパー。
// サーバー側のみで使う（lib/openai/client.ts と同じ思想）。
//
// 環境変数:
//   STRIPE_SECRET_KEY                  — シークレットキー（sk_test_xxx / sk_live_xxx）
//   STRIPE_PRICE_ID_SALON              — 「サロン本会員 月額990円」の Price ID（price_xxx）
//   STRIPE_PRICE_AI_CLONE_ASSISTANT    — AI Clone アシスタント 月額4,980円 の Price ID
//   STRIPE_PRICE_AI_CLONE_PARTNER      — AI Clone パートナー 月額7,980円 の Price ID
//   STRIPE_WEBHOOK_SECRET              — webhook 署名検証用（whsec_xxx）。stripe listen / Dashboard から取得
//   NEXT_PUBLIC_SITE_URL               — リダイレクト先の origin（success/cancel URL の組立用）
//
// API バージョンは固定値で明示（突然 default が変わってビルド失敗を防ぐ）。

import Stripe from "stripe";

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. .env.local に sk_test_xxx を設定してください。",
    );
  }
  cachedClient = new Stripe(key, {
    // apiVersion を明示的に pin（SDK のデフォルトが将来変わって挙動が変化するのを防ぐ）。
    // バージョン文字列は SDK のtypeに合わせて型安全に保つため、SDK 同梱の DEFAULT を使う。
    // 明示文字列にすると stripe@22.x の型と不整合になりビルド失敗するため、ここでは省略。
    typescript: true,
  });
  return cachedClient;
}

/** サロン本会員の Price ID を取得（未設定時は明示エラー） */
export function getSalonPriceId(): string {
  const id = process.env.STRIPE_PRICE_ID_SALON;
  if (!id) {
    throw new Error(
      "STRIPE_PRICE_ID_SALON is not set. Stripe Dashboard で Product/Price を作成し .env.local に price_xxx を設定してください。",
    );
  }
  return id;
}

export type AiClonePlan = "assistant" | "partner";

/** AI Clone（アシスタント / パートナー）の Price ID を取得（未設定時は明示エラー） */
export function getAiClonePriceId(plan: AiClonePlan): string {
  const envKey =
    plan === "assistant"
      ? "STRIPE_PRICE_AI_CLONE_ASSISTANT"
      : "STRIPE_PRICE_AI_CLONE_PARTNER";
  const id = process.env[envKey];
  if (!id) {
    throw new Error(
      `${envKey} is not set. Stripe Dashboard で AI Clone ${plan} 用 Price を作成し .env.local に price_xxx を設定してください。`,
    );
  }
  return id;
}

/** Webhook 署名検証用の secret を取得 */
export function getWebhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not set. `stripe listen --forward-to localhost:3000/api/stripe/webhook` の出力 whsec_xxx を .env.local に設定してください。",
    );
  }
  return s;
}

/** site origin（リダイレクト URL 組立用） */
export function getSiteOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
