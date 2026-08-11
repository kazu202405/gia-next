// 会員「リアル ¥7,980」の Stripe Checkout 起動。
// Server Action（actions.ts）と、ログイン後の自動再開ページ（terakoya/start）の
// 両方から使う。※ "use server" は付けない（通常のサーバーモジュール）。
//
// 2026-08-10: 「テラこや個人会員 ¥11,000」だったが、会員の段の整理で
// 公開する段は online ¥4,980 / real ¥7,980 の2つになった。¥11,000 は
// invite（非公開・URL直渡し）へ移したため、この公開導線は real を売る。
// 決済の作り方は lib/stripe/membership-checkout.ts に集約している。
//
// フロー（「決済前に会員登録」方式）:
//   未ログイン → /login?next=/members/app/terakoya/start へ。登録/ログイン後に
//   自動再開ページへ戻り、再クリック不要で Stripe Checkout に進む。

import { redirect } from "next/navigation";
import { createMembershipCheckout } from "@/lib/stripe/membership-checkout";

export async function terakoyaCheckoutRedirect(): Promise<never> {
  const result = await createMembershipCheckout("real", {
    successPath: "/members/app/mypage?checkout=success",
    cancelPath: "/members",
  });

  // redirect() は NEXT_REDIRECT を throw するため、必ず分岐の外側で呼ぶ。
  switch (result.status) {
    case "unauthenticated":
      redirect(`/login?next=${encodeURIComponent("/members/app/terakoya/start")}`);
    case "already_active":
      redirect("/members/app/mypage?checkout=already");
    case "unavailable":
      redirect("/members?checkout=unavailable");
    case "ok":
      redirect(result.url);
  }
}
