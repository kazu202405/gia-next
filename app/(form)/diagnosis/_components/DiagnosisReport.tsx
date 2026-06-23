"use client";

import { useRef, useState } from "react";
import {
  Download,
  Printer,
  RotateCcw,
  Loader2,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import type { DiagnosisResult, GradeColor } from "@/lib/diagnosis/score";
import { PROPOSALS } from "@/lib/diagnosis/proposals";
import { HOST_LINE_URL } from "@/lib/referral-template";

// グレード色 → クラス（html2canvas-pro 互換のため素朴な配色クラスを使う）
const COLOR: Record<
  GradeColor,
  { bar: string; chip: string; ring: string; text: string }
> = {
  green: {
    bar: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ring: "border-emerald-400",
    text: "text-emerald-600",
  },
  amber: {
    bar: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    ring: "border-amber-400",
    text: "text-amber-600",
  },
  red: {
    bar: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    ring: "border-rose-400",
    text: "text-rose-600",
  },
};

export function DiagnosisReport({
  result,
  advice,
  industry,
  onRestart,
}: {
  result: DiagnosisResult;
  advice: string | null;
  industry: string;
  onRestart: () => void;
}) {
  const proposal = PROPOSALS[result.bottleneck.key];
  const sheetRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!sheetRef.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = "売上ボトルネック診断.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const total = COLOR[colorOfTotal(result)];

  return (
    <div>
      {/* ─── レポート本体（ダウンロード対象） ─── */}
      <div
        ref={sheetRef}
        className="bg-white rounded-2xl border border-[var(--gia-deck-line)] shadow-[0_1px_2px_rgba(28,53,80,0.04)] p-7 sm:p-9"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-3 text-[10px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
            <span aria-hidden className="inline-block w-5 h-px bg-[var(--gia-deck-gold)]" />
            <span>DIAGNOSIS</span>
            <span aria-hidden className="inline-block w-5 h-px bg-[var(--gia-deck-gold)]" />
          </div>
          <h2 className="font-serif text-[22px] sm:text-[26px] font-bold text-[var(--gia-deck-navy)] tracking-[0.04em] mt-3">
            売上ボトルネック診断
          </h2>
          {industry && (
            <p className="text-xs text-[var(--gia-deck-sub)] mt-1">
              業種：{industry}
            </p>
          )}
        </div>

        {/* 総合スコア */}
        <div className="flex flex-col items-center my-7">
          <div
            className={`w-32 h-32 rounded-full border-4 ${total.ring} flex flex-col items-center justify-center`}
          >
            <span className={`font-serif text-5xl font-bold ${total.text} leading-none`}>
              {result.grade}
            </span>
            <span className="text-xs text-[var(--gia-deck-sub)] mt-1">
              {result.total} / 100
            </span>
          </div>
          <p className="text-sm text-[var(--gia-deck-ink)] mt-4 text-center leading-relaxed max-w-md">
            {result.verdict}
          </p>
        </div>

        {/* 5項目スコアバー */}
        <div className="space-y-3.5 mb-8">
          {result.dimensions.map((d) => {
            const c = COLOR[d.color];
            const isBottleneck = d.key === result.bottleneck.key;
            return (
              <div key={d.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--gia-deck-ink)]">
                    <span className="text-[var(--gia-deck-sub)] mr-1">{d.no}.</span>
                    {d.title}
                    <span className="text-[11px] text-[var(--gia-deck-sub)] ml-1.5">
                      {d.subtitle}
                    </span>
                    {isBottleneck && (
                      <span className="text-[10px] font-bold text-rose-600 ml-2">
                        ← 最大の詰まり
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${c.chip}`}
                  >
                    {d.grade}・{d.score}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--gia-deck-line)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.bar}`}
                    style={{ width: `${d.score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* ボトルネック */}
        <div className="rounded-xl border border-[var(--gia-deck-gold)]/40 bg-[var(--gia-deck-gold)]/[0.07] px-5 py-4 mb-4">
          <p className="text-[11px] tracking-[0.2em] text-[var(--gia-deck-gold)] font-bold uppercase mb-1">
            Bottleneck
          </p>
          <p className="text-[15px] font-bold text-[var(--gia-deck-navy)]">
            あなたのボトルネックは「{result.bottleneck.title}」
          </p>
        </div>

        {/* 打つ一手 */}
        <div className="mb-4">
          <p className="text-[13px] font-bold text-[var(--gia-deck-navy)] mb-1.5">
            ▶ まず、打つ一手
          </p>
          <p className="text-sm text-[var(--gia-deck-ink)] leading-relaxed">
            {result.firstMove}
          </p>
        </div>

        {/* やらなくていいこと */}
        <div className="mb-4">
          <p className="text-[13px] font-bold text-[var(--gia-deck-sub)] mb-1.5">
            ✕ 今はやらなくていいこと
          </p>
          <p className="text-sm text-[var(--gia-deck-sub)] leading-relaxed">
            {result.dontDo}
          </p>
        </div>

        {/* AI 簡易アドバイス */}
        {advice && (
          <div className="mt-5 rounded-xl bg-[var(--gia-deck-navy)]/[0.03] border border-[var(--gia-deck-line)] px-5 py-4">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--gia-deck-navy)] mb-2">
              <Sparkles className="w-4 h-4 text-[var(--gia-deck-gold)]" />
              AIからの簡易アドバイス
            </p>
            <p className="text-sm text-[var(--gia-deck-ink)] leading-relaxed whitespace-pre-wrap">
              {advice}
            </p>
          </div>
        )}

        {/* 提案（クロスセルの入口・売り込まず気づきとして） */}
        <div className="mt-4">
          <p className="text-[13px] font-bold text-[var(--gia-deck-navy)] mb-1.5">
            ◇ この詰まり、誰かに頼むなら
          </p>
          <p className="text-sm text-[var(--gia-deck-ink)] leading-relaxed mb-2">
            {proposal.lead}
          </p>
          <ul className="space-y-1.5">
            {proposal.services.map((s) => (
              <li
                key={s}
                className="flex items-start gap-2 text-sm text-[var(--gia-deck-ink)]"
              >
                <span aria-hidden className="text-[var(--gia-deck-gold)] mt-0.5 text-[11px]">
                  ◆
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-[10px] text-[var(--gia-deck-sub)] mt-7 leading-relaxed">
          ※ ざっくり推定です。精度より「次の一手を1つに絞る」ための地図として。
          <br />
          GIA／紹介設計研究所
        </p>
      </div>

      {/* ─── 操作ボタン（出力には含めない） ─── */}
      <div className="print:hidden flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold py-3.5 px-5 hover:bg-[var(--gia-deck-navy-deep)] transition-colors disabled:opacity-60"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          画像で保存
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--gia-deck-navy)]/20 text-[var(--gia-deck-navy)] text-sm font-semibold py-3.5 px-5 hover:bg-[var(--gia-deck-navy)]/[0.04] transition-colors"
        >
          <Printer className="w-4 h-4" />
          印刷 / PDF保存
        </button>
        <button
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-2 rounded-xl text-[var(--gia-deck-sub)] text-sm font-medium py-3.5 px-5 hover:text-[var(--gia-deck-navy)] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          もう一度
        </button>
      </div>

      {/* 柔らかい紹介導線（売り込まない。必要なら紹介します、の温度感） */}
      <div className="print:hidden mt-5 rounded-2xl border border-[var(--gia-deck-gold)]/30 bg-[var(--gia-deck-gold)]/[0.06] px-5 py-5 text-center">
        <p className="text-sm text-[var(--gia-deck-ink)] leading-relaxed">
          結果は保存しておいてください。もし
          <span className="font-semibold text-[var(--gia-deck-navy)]">
            「{result.bottleneck.title}」
          </span>
          の打ち手を進めたくなったら、信頼できる専門家や
          <span className="font-semibold text-[var(--gia-deck-navy)]">
            紹介設計研究所のメンバー
          </span>
          をご紹介します。お気軽にご連絡ください。
        </p>
        <a
          href={HOST_LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 mt-4 rounded-xl border border-[var(--gia-deck-navy)]/20 text-[var(--gia-deck-navy)] text-sm font-semibold py-3 px-6 hover:bg-[var(--gia-deck-navy)]/[0.04] transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          LINEで相談する
        </a>
      </div>
    </div>
  );
}

// 総合スコアの色（バンドはグレードと同じ閾値）
function colorOfTotal(result: DiagnosisResult): GradeColor {
  if (result.grade === "S" || result.grade === "A") return "green";
  if (result.grade === "B") return "amber";
  return "red";
}
