"use server";

// /upgrade の会員CTA（¥4,980）から呼ぶ Server Action。
//
// 2026-08-10 の変更:
//   以前は「本会員 ＝ 右腕AI(assistant) の購入と一体」で、右腕AIの Checkout
//   コアに委譲し、決済完了時に ai_clone_tenants を自動作成しつつ
//   applicants.plan='pro' を立てていた。
//   右腕AIの外販を停止したため、ここは会員の段 online（¥4,980）を売る。
//   Price ID は従来と同じ（GIA4980）で、購入者から見た金額は変わらない。
//   変わるのは決済後の扱いで、右腕AIのテナントは作られず plan='online' が付く。
//   既存の右腕AI契約は据え置き（webhook の更新・解約処理は残してある）。

import { redirect } from "next/navigation";
import { createMembershipCheckout } from "@/lib/stripe/membership-checkout";
import { NOTE_URL } from "@/lib/company-note";

/**
 * 本会員（¥4,980）の決済を始める。
 *
 * ⚠️ **どこから来たかを最後まで持ち回る。** Company Note の会員限定ゲートから
 *    来た人を GIA のマイページに着地させると、買ったはずの機能に戻る道が
 *    示されない。/upgrade/[plan]（¥11,000）では既に対策済みだったが、
 *    こちら（¥4,980）は successPath が固定で、同じ迷子が起きていた。
 *
 * `origin` は呼び出し側で bind する。任意文字列は通さない（既知の値だけ）。
 */
export async function startProMembership(
  origin: "note" | null,
): Promise<never> {
  const fromNote = origin === "note";
  const originQuery = fromNote ? "&from=note" : "";

  const result = await createMembershipCheckout("online", {
    successPath: `/upgrade/success?session_id={CHECKOUT_SESSION_ID}${originQuery}`,
    cancelPath: fromNote ? "/upgrade?from=note" : "/upgrade",
  });

  // redirect() は NEXT_REDIRECT を throw するため、分岐の外側で呼ぶ。
  switch (result.status) {
    case "unauthenticated":
      redirect(
        `/login?next=${encodeURIComponent(fromNote ? "/upgrade?from=note" : "/upgrade")}`,
      );
    case "already_active":
      // 既に会員。Company Note から来たなら、そのまま Company Note へ返す。
      if (fromNote) redirect(NOTE_URL);
      redirect("/members/app/mypage?checkout=already");
    case "unavailable":
      redirect(
        fromNote
          ? "/upgrade?checkout=unavailable&from=note"
          : "/upgrade?checkout=unavailable",
      );
    case "ok":
      redirect(result.url);
  }
}
