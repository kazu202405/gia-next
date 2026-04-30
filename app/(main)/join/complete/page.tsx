import { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { upcomingSeminars, formatSeminarDate } from "@/lib/seminars";

export const metadata: Metadata = {
  title: { absolute: "申込完了 | GIAの酒場" },
};

// 仮登録（Tier 1）完了画面。
// セミナー申込のお礼 + 次回イベント詳細 + LINE グループ招待 + 本登録誘導。
// mock のため state は持たず、Server Component として描画する。
//
// 2026-04-27 デザイン方針: GIA A系統（資料と同トーン）に統一。
// teal を完全排除し、Navy + Warm Gold + ivory + Serif で構成。
// 次回イベントカードは deck の card.n を踏襲（gold の番号タグ + 細い罫線）。
export default function JoinCompletePage() {
  // upcomingSeminars は日付昇順前提。先頭を「次回イベント」として表示。
  const nextSeminar = upcomingSeminars[0];

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        {/* 完了見出し */}
        <header className="text-center mb-12">
          <ChapterTag>WELCOME</ChapterTag>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--gia-deck-gold)]/10 text-[var(--gia-deck-gold)] mt-6 mb-5 border border-[var(--gia-deck-gold)]/30">
            <CheckCircle2 className="w-7 h-7" strokeWidth={1.75} />
          </div>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4]">
            お申込ありがとうございます
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            登録いただいた内容で、仮登録が完了しました。
            <br className="hidden sm:block" />
            当日のご参加をお待ちしております。
          </p>
        </header>

        {/* 次回イベントカード（deck card.n を踏襲：左罫線 gold + 番号タグ） */}
        {nextSeminar && (
          <section
            className="relative bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] p-7 sm:p-9 mb-6"
            style={{
              borderLeft: "3px solid var(--gia-deck-gold)",
            }}
          >
            {/* 上部の小タグ：「NEXT EVENT」 */}
            <div className="flex items-center gap-3 mb-5">
              <span
                aria-hidden
                className="inline-block w-5 h-px bg-[var(--gia-deck-gold)]"
              />
              <span className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em]">
                NEXT EVENT
              </span>
            </div>

            <h2 className="font-serif text-xl sm:text-[22px] font-bold text-[var(--gia-deck-navy)] leading-[1.5] mb-5 tracking-[0.03em]">
              {nextSeminar.title}
            </h2>

            <div className="space-y-3 text-sm text-[var(--gia-deck-ink)]">
              <InfoRow icon={<Calendar className="w-4 h-4" />}>
                {formatSeminarDate(nextSeminar.date)}
              </InfoRow>
              <InfoRow icon={<Clock className="w-4 h-4" />}>
                {nextSeminar.time}
              </InfoRow>
              <InfoRow icon={<MapPin className="w-4 h-4" />}>
                {nextSeminar.location}
              </InfoRow>
            </div>

            <p className="text-sm text-[var(--gia-deck-sub)] leading-[1.9] mt-6 pt-5 border-t border-[var(--gia-deck-line)]">
              {nextSeminar.description}
            </p>

            {/* LINE グループ招待ボタン（navy ベース、gold ライン控えめ） */}
            {nextSeminar.lineGroupUrl && (
              <a
                href={nextSeminar.lineGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-3.5 px-5 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200"
              >
                <MessageCircle className="w-4 h-4" />
                LINEグループに参加する
              </a>
            )}
          </section>
        )}

        {/* 本登録（無料）への誘導 */}
        <section className="bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] p-7 sm:p-9 mb-6">
          <SectionLabel>NEXT STEP</SectionLabel>
          <h3 className="font-serif text-lg font-bold text-[var(--gia-deck-navy)] leading-[1.5] mt-2 mb-5 tracking-[0.03em]">
            本登録（無料）にお進みください
          </h3>

          {/* 注記アラート（gold 淡背景） */}
          <div className="rounded-xl bg-[var(--gia-deck-gold)]/8 border border-[var(--gia-deck-gold)]/30 px-4 py-3.5 mb-6">
            <p className="text-[13px] text-[var(--gia-deck-ink)] leading-[1.85]">
              本登録（無料）にお進みいただくと、人脈ネットワークの閲覧や紹介依頼ができるようになります。
              <br />
              本登録しなくても、次回ご参加時のためにご入力いただいた情報は保存されます。
            </p>
          </div>

          <Link
            href="/members/app/mypage"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200"
          >
            本登録（無料）に進む
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* トップに戻る */}
        <div className="text-center mt-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--gia-deck-sub)] hover:text-[var(--gia-deck-navy)] transition-colors underline underline-offset-4 decoration-[var(--gia-deck-line)]"
          >
            トップに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-[var(--gia-deck-gold)] flex-shrink-0">
        {icon}
      </span>
      <span className="text-[var(--gia-deck-ink)]">{children}</span>
    </div>
  );
}

function ChapterTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
      <span>{children}</span>
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em]">
      {children}
    </div>
  );
}
