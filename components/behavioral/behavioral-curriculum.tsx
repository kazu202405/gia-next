"use client";

import { useEffect, useRef } from "react";
import {
  Search,
  Compass,
  Wrench,
  Repeat,
  BarChart3,
  Rocket,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const modules = [
  {
    number: "01",
    icon: Search,
    title: "行動診断",
    phase: "Phase 1：現状把握",
    duration: "Week 1–2",
    description:
      "18問の組織行動診断を実施。6領域のスコアリングで現状の行動パターンを可視化し、改善すべきボトルネックを特定。",
  },
  {
    number: "02",
    icon: Compass,
    title: "ナッジ設計",
    phase: "Phase 2：設計",
    duration: "Week 3–4",
    description:
      "診断結果をもとに、選択アーキテクチャとデフォルト設計を立案。「人が自然に動く」環境の設計図をつくる。",
  },
  {
    number: "03",
    icon: Wrench,
    title: "環境実装",
    phase: "Phase 2：設計",
    duration: "Week 5–8",
    description:
      "オフィス環境・会議体・ワークフロー・ツールに行動科学の知見を実装。必要に応じてシステム開発も社内で対応。",
  },
  {
    number: "04",
    icon: Repeat,
    title: "習慣化定着",
    phase: "Phase 3：定着",
    duration: "Week 9–12",
    description:
      "Tiny Habits メソッドで新しいプロセスを習慣化。トリガー・ルーティン・報酬の3要素で「やらされ感」なく定着。",
  },
  {
    number: "05",
    icon: BarChart3,
    title: "効果測定",
    phase: "Phase 3：定着",
    duration: "Week 13–14",
    description:
      "行動KPIダッシュボードで変化を定量的に計測。Before/Afterの比較で投資対効果を明確化。",
  },
  {
    number: "06",
    icon: Rocket,
    title: "自走化移行",
    phase: "Phase 4：自走",
    duration: "Week 15–16",
    description:
      "社内ファシリテーターを育成し、行動科学の知見を自社内で回せる体制へ。継続的な改善サイクルを確立。",
  },
];

const phases = [
  { label: "Phase 1", name: "現状把握", color: "#c8a55a", weeks: "Week 1–2" },
  { label: "Phase 2", name: "設計・実装", color: "#2d8a80", weeks: "Week 3–8" },
  { label: "Phase 3", name: "定着", color: "#2d8a80", weeks: "Week 9–14" },
  { label: "Phase 4", name: "自走", color: "#c8a55a", weeks: "Week 15–16" },
];

export function BehavioralCurriculum() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bc-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bc-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bc-phase",
        { scaleX: 0, opacity: 0 },
        {
          scaleX: 1,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bc-phases",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bc-module",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bc-timeline",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Animate the timeline line
      gsap.fromTo(
        ".bc-line",
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bc-timeline",
            start: "top 85%",
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
      className="relative overflow-hidden py-24 md:py-32 bg-[#0f1f33]"
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="bc-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            CURRICULUM
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            16週間の行動変容プログラム
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            診断→設計→実装→定着→自走。6モジュールで組織の行動を根本から変える。
          </p>
        </div>

        {/* Phase bar */}
        <div className="bc-phases flex gap-2 mb-12 max-w-3xl mx-auto">
          {phases.map((phase) => (
            <div
              key={phase.label}
              className="bc-phase flex-1 origin-left"
            >
              <div
                className="h-1.5 rounded-full mb-2"
                style={{ backgroundColor: phase.color, opacity: 0.6 }}
              />
              <p className="text-xs font-bold text-white/80">{phase.label}</p>
              <p className="text-[10px] text-white/40">{phase.name}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="bc-timeline relative max-w-3xl mx-auto">
          {/* Vertical line */}
          <div className="bc-line absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#2d8a80] via-[#2d8a80]/50 to-[#c8a55a] origin-top" />

          <div className="space-y-6">
            {modules.map((mod) => (
              <div
                key={mod.number}
                className="bc-module relative flex gap-6 md:gap-8"
              >
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 w-12 md:w-16 flex items-start justify-center pt-6">
                  <div className="w-3 h-3 rounded-full bg-[#2d8a80] border-2 border-[#0f1f33] shadow-[0_0_10px_rgba(45,138,128,0.4)]" />
                </div>

                {/* Card */}
                <div className="flex-1 p-6 rounded-2xl bg-white/[0.05] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.08]">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2d8a80]/15 flex items-center justify-center">
                        <mod.icon className="w-5 h-5 text-[#2d8a80]" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70">
                          MODULE {mod.number}
                        </span>
                        <h3 className="text-base font-bold text-white">
                          {mod.title}
                        </h3>
                      </div>
                    </div>
                    <span className="text-xs text-white/40 font-medium bg-white/5 px-2.5 py-1 rounded-full">
                      {mod.duration}
                    </span>
                  </div>
                  <p className="text-sm text-white/55 leading-relaxed">
                    {mod.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
