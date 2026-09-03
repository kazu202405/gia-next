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
import { NOTE_URL } from "@/lib/company-note";

export const metadata = {
  title: "お申し込み | GIA",
  // 非公開の段のURLを検索結果に出さない
  robots: { index: false, follow: false },
};

export default async function PlanCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ plan: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { plan } = await params;
  const { from } = await searchParams;

  if (!isMembershipPlan(plan)) {
    redirect("/upgrade");
  }

  // ⚠️ **どこから来たかを最後まで持ち回る。** Company Note の案内
  //    （note.gia2018.com/invite）から入った人を GIA 側の画面に着地させると、
  //    自分が何を買ったのか分からなくなる。決済後は元の場所へ返す。
  //    任意文字列を通さない（オープンリダイレクトを作らないため、既知の値だけ）。
  const origin = from === "note" ? "note" : null;
  const originQuery = origin ? `&from=${origin}` : "";

  const result = await createMembershipCheckout(plan, {
    successPath: `/upgrade/success?session_id={CHECKOUT_SESSION_ID}${originQuery}`,
    cancelPath: `/upgrade/${plan}${origin ? `?from=${origin}` : ""}`,
  });

  // redirect() は NEXT_REDIRECT を throw するため、分岐の外側で呼ぶ。
  switch (result.status) {
    case "unauthenticated":
      // 登録／ログイン後にこのURLへ戻し、再クリック不要で決済へ進ませる
      redirect(`/login?next=${encodeURIComponent(`/upgrade/${plan}`)}`);
    case "already_active":
      // 既に会員。Company Note から来たなら、そのまま Company Note へ返す
      if (origin === "note") {
        redirect(NOTE_URL);
      }
      redirect("/members/app/mypage?checkout=already");
    case "unavailable":
      redirect("/upgrade?checkout=unavailable");
    case "ok":
      redirect(result.url);
  }
}
