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

export async function startProMembership(): Promise<never> {
  const result = await createMembershipCheckout("online", {
    successPath: "/upgrade/success?session_id={CHECKOUT_SESSION_ID}",
    cancelPath: "/upgrade",
  });

  // redirect() は NEXT_REDIRECT を throw するため、分岐の外側で呼ぶ。
  switch (result.status) {
    case "unauthenticated":
      redirect(`/login?next=${encodeURIComponent("/upgrade")}`);
    case "already_active":
      redirect("/members/app/mypage?checkout=already");
    case "unavailable":
      redirect("/upgrade?checkout=unavailable");
    case "ok":
      redirect(result.url);
  }
}
