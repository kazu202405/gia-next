// 「サロン本会員になる」ランディング（ログイン済ユーザー専用）。
// 旧: 新規登録フォーム（name/email/password）
// 新: 仮登録(tentative)から本登録(paid)へ昇格するための Stripe Checkout 起動画面。
//
// アクセス制御（Server Component）:
//   - 未ログイン → /login にリダイレクト（戻り先 /upgrade を query で保持）
//   - 既に paid → /members/app/mypage にリダイレクト（重複決済防止）
//   - tentative → このページを表示（Checkout ボタンあり）

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpgradeCta } from "./_components/UpgradeCta";

export const metadata = {
  title: "サロン本会員になる | GIA",
  description:
    "GIAの酒場（月990円）。紹介コーチAI、メンバー人脈フル閲覧、紹介依頼の送信、不定期オフ会・セミナーが使えるようになります。",
};

export default async function UpgradePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/upgrade");
  }

  const { data: applicant } = await supabase
    .from("applicants")
    .select("id, name, tier")
    .eq("id", user.id)
    .single();

  if (applicant?.tier === "paid") {
    redirect("/members/app/mypage");
  }

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
            <span>MEMBERSHIP</span>
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
          </div>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mt-5">
            サロン本会員になる
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            『GIAの酒場』へようこそ。
            <br className="hidden sm:block" />
            紹介を仕組みにする実践コミュニティです。
          </p>
        </header>

        {/* 特典カード */}
        <div className="bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] overflow-hidden">
          <div className="p-7 sm:p-10 space-y-6">
            <div>
              <div className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em] mb-3">
                BENEFITS
              </div>
              <ul className="space-y-3 text-sm text-[var(--gia-deck-ink)] leading-relaxed">
                <li className="flex items-start gap-3">
                  <span aria-hidden className="text-[var(--gia-deck-gold)] mt-1">◆</span>
                  <span><strong>メンバー人脈の閲覧</strong> — 他メンバーのプロフィール詳細・紹介ツリー</span>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="text-[var(--gia-deck-gold)] mt-1">◆</span>
                  <span><strong>紹介コーチAI 24時間相談</strong> — 紹介と営業の困りごとを、AIが「次の一手」で返す</span>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="text-[var(--gia-deck-gold)] mt-1">◆</span>
                  <span><strong>紹介依頼の送信</strong> — メンバー経由の紹介依頼を発信／受信</span>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="text-[var(--gia-deck-gold)] mt-1">◆</span>
                  <span><strong>不定期オフ会・セミナー</strong> — 限定回・少人数会への先行案内</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-[var(--gia-deck-line)] pt-6">
              <div className="flex items-baseline justify-between mb-4">
                <span className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em]">
                  PRICE
                </span>
                <div>
                  <span className="font-serif text-3xl font-bold text-[var(--gia-deck-navy)] tracking-tight">
                    ¥990
                  </span>
                  <span className="text-xs text-[var(--gia-deck-sub)] ml-1">/ 月（税別）</span>
                </div>
              </div>
              <p className="text-[11px] text-[var(--gia-deck-sub)] leading-relaxed">
                ※ いつでも解約可能。決済は Stripe（クレジットカード）。
              </p>
            </div>

            <UpgradeCta />
          </div>
        </div>
      </div>
    </div>
  );
}
