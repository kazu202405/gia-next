"use client";

import { useEffect, useRef } from "react";
import { X, Check, Brain, ClipboardList, Users, BarChart3, Lightbulb, Repeat } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const comparisons = [
  {
    category: "アプローチ",
    icon: Brain,
    traditional: "理論・フレームワーク偏重",
    behavioral: "行動データ × 心理モデル",
  },
  {
    category: "提案内容",
    icon: ClipboardList,
    traditional: "報告書・提言で終了",
    behavioral: "現場で「行動が変わる」仕組み設計",
  },
  {
    category: "組織変革",
    icon: Users,
    traditional: "トップダウンの号令",
    behavioral: "ナッジ設計で自然に行動変容",
  },
  {
    category: "成果指標",
    icon: BarChart3,
    traditional: "売上・利益のみ",
    behavioral: "行動指標 → 先行指標 → 業績",
  },
  {
    category: "定着率",
    icon: Repeat,
    traditional: "支援終了後に元に戻る",
    behavioral: "習慣化設計で自走する組織へ",
  },
  {
    category: "根本思想",
    icon: Lightbulb,
    traditional: "「正しいことを教える」",
    behavioral: "「人が自然に動く環境をつくる」",
  },
];

export function BehavioralProblem() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bp-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bp-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bp-row",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bp-table",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);

    ScrollTrigger.refresh(true);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden py-24 md:py-32 bg-[#f8f7f5]"
    >
      {/* Subtle radial gradient */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[800px] h-[800px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(45,138,128,0.06) 0%, rgba(45,138,128,0.02) 40%, transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bp-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            WHY BEHAVIORAL SCIENCE?
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0f1f33] mb-4">
            「正しいこと」を教えても、
            <br className="hidden sm:block" />
            人は動かない。
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            戦略設計と、行動設計の違いをご覧ください。
          </p>
        </div>

        {/* Comparison Table */}
        <div className="bp-table max-w-5xl mx-auto">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[1fr_1fr_1fr] gap-4 mb-4 px-6">
            <div />
            <div className="text-center">
              <span className="inline-block text-xs font-bold tracking-widest text-slate-400 bg-slate-100 px-4 py-1.5 rounded-full">
                戦略設計（従来型）
              </span>
            </div>
            <div className="text-center">
              <span className="inline-block text-xs font-bold tracking-widest text-[#2d8a80] bg-[#2d8a80]/10 px-4 py-1.5 rounded-full">
                行動設計（GIA）
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-3">
            {comparisons.map((item) => (
              <div
                key={item.category}
                className="bp-row grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60"
              >
                {/* Category */}
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#0f1f33]/5 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-[#0f1f33]/60" />
                  </div>
                  <span className="text-sm font-bold text-[#0f1f33]">
                    {item.category}
                  </span>
                </div>

                {/* Traditional */}
                <div className="flex items-center gap-2 md:justify-center pl-13 md:pl-0">
                  <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-slate-500">
                    {item.traditional}
                  </span>
                </div>

                {/* Behavioral */}
                <div className="flex items-center gap-2 md:justify-center pl-13 md:pl-0">
                  <Check className="w-4 h-4 text-[#2d8a80] flex-shrink-0" />
                  <span className="text-sm text-[#0f1f33] font-medium">
                    {item.behavioral}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
