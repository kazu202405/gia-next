// 会員の段を指定して決済を始める中継ページ（URL直渡し用）。
//
//   /upgrade/invite   → ¥11,000
//   /upgrade/premium  → ¥33,000
//
// invite / premium は募集画面に出さず、URLを個別に渡して申し込んでもらう段。
// 「非公開」は URL を配らないという運用上の意味で、URLを知っていれば誰でも
// 申し込める。人を絞りたい場合は別途 招待コードの仕組みが必要。
//
// 公開2段（online / real）もここから開ける。動線を1本に保つため弾かない。
//
// ルーティングの注意: 同じ階層に静的な /upgrade/success があるが、
// Next.js は静的セグメントを動的セグメントより優先するため衝突しない。

import { redirect } from "next/navigation";
import { isMembershipPlan } from "@/lib/stripe/client";
import { createMembershipCheckout } from "@/lib/stripe/membership-checkout";

export const metadata = {
  title: "お申し込み | GIA",
  // 非公開の段のURLを検索結果に出さない
  robots: { index: false, follow: false },
};

export default async function PlanCheckoutPage({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  const { plan } = await params;

  if (!isMembershipPlan(plan)) {
    redirect("/upgrade");
  }

  const result = await createMembershipCheckout(plan, {
    successPath: "/upgrade/success?session_id={CHECKOUT_SESSION_ID}",
    cancelPath: `/upgrade/${plan}`,
  });

  // redirect() は NEXT_REDIRECT を throw するため、分岐の外側で呼ぶ。
  switch (result.status) {
    case "unauthenticated":
      // 登録／ログイン後にこのURLへ戻し、再クリック不要で決済へ進ませる
      redirect(`/login?next=${encodeURIComponent(`/upgrade/${plan}`)}`);
    case "already_active":
      redirect("/members/app/mypage?checkout=already");
    case "unavailable":
      redirect("/upgrade?checkout=unavailable");
    case "ok":
      redirect(result.url);
  }
}
