"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, RotateCcw, TrendingUp, AlertTriangle, CheckCircle2, Award } from "lucide-react";
import gsap from "gsap";
import { DiagnosticRadar, type DomainScore } from "./diagnostic-radar";

interface DomainResult {
  label: string;
  score: number;
  angle: number;
  advice: string;
}

interface DiagnosticResultProps {
  domainResults: DomainResult[];
  onRetry: () => void;
}

function getLevel(score: number): {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Award;
} {
  if (score >= 80) return { label: "優秀", color: "text-emerald-400", bgColor: "bg-emerald-400/10", icon: Award };
  if (score >= 60) return { label: "良好", color: "text-[#2d8a80]", bgColor: "bg-[#2d8a80]/10", icon: CheckCircle2 };
  if (score >= 40) return { label: "改善余地", color: "text-[#c8a55a]", bgColor: "bg-[#c8a55a]/10", icon: TrendingUp };
  return { label: "要注意", color: "text-orange-400", bgColor: "bg-orange-400/10", icon: AlertTriangle };
}

function getOverallComment(score: number): string {
  if (score >= 80)
    return "組織の行動設計が非常に高いレベルで機能しています。この強みを維持しながら、さらなる高みを目指しましょう。";
  if (score >= 60)
    return "基盤はしっかりしていますが、いくつかの領域に改善の余地があります。重点的な取り組みで大きな飛躍が期待できます。";
  if (score >= 40)
    return "組織の行動パターンに改善が必要な領域が見られます。行動科学のアプローチで、仕組みから変えていくことが効果的です。";
  return "組織の行動設計に根本的な見直しが必要です。まずは最もスコアの低い領域から、小さな改善を積み重ねましょう。";
}

export function DiagnosticResult({ domainResults, onRetry }: DiagnosticResultProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const overallScore = Math.round(
    domainResults.reduce((sum, d) => sum + d.score, 0) / domainResults.length
  );
  const overallLevel = getLevel(overallScore);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.fromTo(
        ".dr-header",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 }
      )
        .fromTo(
          ".dr-overall",
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.7 },
          "-=0.3"
        )
        .fromTo(
          ".dr-radar",
          { scale: 0.9, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.8 },
          "-=0.3"
        )
        .fromTo(
          ".dr-domain-card",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
          "-=0.3"
        )
        .fromTo(
          ".dr-cta",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.1"
        );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const radarDomains: DomainScore[] = domainResults.map((d) => ({
    label: d.label,
    score: d.score,
    angle: d.angle,
  }));

  return (
    <div ref={containerRef} className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="dr-header text-center mb-12">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            DIAGNOSTIC RESULT
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            診断結果
          </h2>
          <p className="text-base text-white/50">
            あなたの組織の行動パターン分析結果です
          </p>
        </div>

        {/* Overall Score */}
        <div className="dr-overall mb-12">
          <div className="max-w-md mx-auto p-6 rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm text-center">
            <p className="text-sm text-white/40 mb-2">総合スコア</p>
            <div className="flex items-center justify-center gap-4 mb-3">
              <span className="text-6xl font-bold text-white">
                {overallScore}
              </span>
              <span className="text-lg text-white/30">/100</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${overallLevel.bgColor} ${overallLevel.color}`}
            >
              <overallLevel.icon className="w-4 h-4" />
              {overallLevel.label}
            </span>
            <p className="text-sm text-white/40 mt-4 leading-relaxed">
              {getOverallComment(overallScore)}
            </p>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="dr-radar mb-12">
          <div className="max-w-sm mx-auto">
            <DiagnosticRadar domains={radarDomains} />
          </div>
        </div>

        {/* Domain Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {domainResults.map((d) => {
            const level = getLevel(d.score);
            return (
              <div
                key={d.label}
                className="dr-domain-card p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white/90">{d.label}</h3>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${level.bgColor} ${level.color}`}
                  >
                    {level.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-3xl font-bold text-white">
                    {d.score}
                  </span>
                  <span className="text-sm text-white/30">/100</span>
                </div>
                {/* Score bar */}
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-[#2d8a80] to-[#3a9e93] rounded-full"
                    style={{ width: `${d.score}%` }}
                  />
                </div>
                <p className="text-xs text-white/40 leading-relaxed">
                  {d.advice}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="dr-cta text-center">
          <div className="max-w-lg mx-auto p-8 rounded-3xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
            <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl font-semibold text-white mb-3">
              詳しい改善プランを受け取る
            </h3>
            <p className="text-sm text-white/40 mb-6 leading-relaxed">
              行動科学の専門家が、あなたの組織に合わせた
              <br className="hidden sm:block" />
              具体的な改善プランをご提案します。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/contact"
                className="btn-glow group inline-flex items-center gap-3 px-8 py-4 bg-[#2d8a80] text-white font-bold text-base rounded-full hover:bg-[#247a70] transition-all duration-300 shadow-lg hover:shadow-[0_12px_40px_rgba(45,138,128,0.25)] hover:-translate-y-0.5"
              >
                無料相談を申し込む
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-6 py-4 text-sm text-white/40 hover:text-white/70 transition-colors duration-300"
              >
                <RotateCcw className="w-4 h-4" />
                もう一度診断する
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
