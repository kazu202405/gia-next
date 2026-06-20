"use server";

// /upgrade の「本会員（¥4,980・右腕AIフル込み）」CTA から呼ぶ Server Action。
//
// 本会員 ＝ 右腕AI(assistant) の購入と一体。実体は AI Clone(assistant) の Checkout
// 起動コアに委譲する（右腕AI自動プロビジョニング付き）。決済完了時、webhook が
// ai_clone_tenants を作成しつつ applicants.plan='pro'（本会員）を立てる。
//
// 未ログイン→/login?next=…、既owner→/clone/<slug>、Stripe未設定→/upgrade?checkout=unavailable
// は全てコア側で処理される。

import { aiCloneCheckoutRedirect } from "@/app/services/ai/checkout-core";

export async function startProMembership(): Promise<never> {
  // assistant プラン（¥4,980）を本会員の中身として使う。戻り先は /upgrade。
  return aiCloneCheckoutRedirect("assistant", "/upgrade");
}
