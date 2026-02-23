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
    behavioral: "行動デザインで自然に行動変容",
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

      // Per-row scroll highlight: teal left-border flash as each row enters viewport
      const rows = containerRef.current?.querySelectorAll(".bp-row");
      rows?.forEach((row) => {
        gsap.fromTo(
          row,
          { borderLeftColor: "transparent" },
          {
            borderLeftColor: "#2d8a80",
            duration: 0.4,
            ease: "power2.in",
            scrollTrigger: {
              trigger: row,
              start: "top 85%",
              toggleActions: "play none none none",
            },
            onComplete() {
              gsap.to(row, {
                borderLeftColor: "transparent",
                duration: 0.8,
                delay: 0.3,
                ease: "power2.out",
              });
            },
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden py-24 md:py-32 bg-[#f8f7f5]"
    >
      {/* Top glow separator */}
      <div className="section-glow-top" />

      {/* Flowing wave shape - left */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-[40%] h-full hidden md:block"
        style={{
          background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 1100' preserveAspectRatio='none'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%232d8a80' stop-opacity='0.08'/%3E%3Cstop offset='100%25' stop-color='%232d8a80' stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0,0 C200,100 80,300 180,500 C280,700 60,900 200,1100 L0,1100 Z' fill='url(%23g)'/%3E%3Cpath d='M0,0 C150,150 50,350 160,550 C270,750 40,950 180,1100' stroke='%232d8a80' stroke-width='1.5' fill='none' opacity='0.15'/%3E%3Cpath d='M0,50 C180,180 30,400 170,580 C300,770 50,960 190,1100' stroke='%232d8a80' stroke-width='0.8' fill='none' opacity='0.08' stroke-dasharray='10 8'/%3E%3C/svg%3E") no-repeat`,
          backgroundSize: "100% 100%",
        }}
        aria-hidden="true"
      />

      {/* Flowing wave shape - right */}
      <div
        className="pointer-events-none absolute top-0 right-0 w-[40%] h-full hidden md:block"
        style={{
          background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 1100' preserveAspectRatio='none'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='1' y1='0' x2='0' y2='0'%3E%3Cstop offset='0%25' stop-color='%23c8a55a' stop-opacity='0.06'/%3E%3Cstop offset='100%25' stop-color='%23c8a55a' stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M400,0 C200,100 320,300 220,500 C120,700 340,900 200,1100 L400,1100 Z' fill='url(%23g)'/%3E%3Cpath d='M400,0 C250,150 350,350 240,550 C130,750 360,950 220,1100' stroke='%23c8a55a' stroke-width='1.5' fill='none' opacity='0.12'/%3E%3Cpath d='M400,50 C220,180 370,400 230,580 C100,770 350,960 210,1100' stroke='%232d8a80' stroke-width='0.8' fill='none' opacity='0.08' stroke-dasharray='10 8'/%3E%3C/svg%3E") no-repeat`,
          backgroundSize: "100% 100%",
        }}
        aria-hidden="true"
      />

      {/* Center animated flow line */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full hidden md:block" aria-hidden="true">
        <div className="w-full h-full bg-gradient-to-b from-transparent via-[#2d8a80]/15 to-transparent" />
        <div
          className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#2d8a80]/40 to-transparent"
          style={{ animation: "scroll-line 3s ease-in-out infinite" }}
        />
      </div>

      {/* Floating blob decoration - top right */}
      <div
        className="pointer-events-none absolute -top-20 -right-32 w-[420px] h-[420px] rounded-full opacity-30 animate-[mesh-drift_18s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(45,138,128,0.12) 0%, rgba(200,165,90,0.06) 50%, transparent 75%)",
        }}
      />

      {/* Floating blob decoration - bottom left */}
      <div
        className="pointer-events-none absolute -bottom-24 -left-28 w-[360px] h-[360px] rounded-full opacity-25 animate-[mesh-drift-reverse_22s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(200,165,90,0.10) 0%, rgba(45,138,128,0.05) 50%, transparent 75%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bp-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            行動科学とは
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0f1f33] mb-4">
            「正しいこと」を教えても
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
                行動設計（弊社）
              </span>
            </div>
          </div>

          {/* Rows */}
          <div className="space-y-3">
            {comparisons.map((item) => (
              <div
                key={item.category}
                className="bp-row grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr] gap-3 md:gap-4 p-4 md:p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 border-l-[3px] border-l-transparent transition-all duration-300 hover:border-l-[#2d8a80] hover:shadow-[inset_4px_0_12px_rgba(45,138,128,0.08)]"
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
