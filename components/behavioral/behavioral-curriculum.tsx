"use client";

import { useEffect, useRef } from "react";
import {
  MessageCircle,
  ClipboardList,
  Brain,
  Rocket,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: "01",
    icon: MessageCircle,
    title: "無料相談",
    description:
      "まずは現状をお聞かせください。思考や事業の整理から、業務上のお困りごとまで。何を相談すればいいかわからなくても大丈夫です。",
  },
  {
    number: "02",
    icon: ClipboardList,
    title: "業務フロー整理",
    description:
      "現在の業務がどう流れているかを一緒に可視化します。「誰が・何を・どの順番で」やっているかが見えるだけで、改善すべきポイントが明確になります。",
  },
  {
    number: "03",
    icon: Brain,
    title: "AI活用設計",
    description:
      "整理された業務フローをもとに、AIが効果を発揮できるポイントを特定。必要なDX施策とあわせて、実現可能な設計図をつくります。",
  },
  {
    number: "04",
    icon: Rocket,
    title: "DX / システム開発",
    description:
      "設計に基づいて、自動化やシステム化を実装します。外注ではなく社内で対応するため、スピードもコストも最適化できます。",
  },
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
        ".bc-module",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bc-timeline",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

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

    return () => ctx.revert();
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

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="bc-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            選ばれる仕組みができるまで
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            相談から仕組み化まで、4ステップ
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            いきなりシステム導入ではありません。相談から始めて、必要なことだけを順番に。
          </p>
        </div>

        {/* Timeline */}
        <div className="bc-timeline relative max-w-3xl mx-auto">
          {/* Vertical line */}
          <div className="bc-line absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[#2d8a80] via-[#2d8a80]/50 to-[#c8a55a] origin-top" />

          <div className="space-y-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bc-module relative flex gap-6 md:gap-8"
              >
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 w-12 md:w-16 flex items-start justify-center pt-6">
                  <div className="w-3 h-3 rounded-full bg-[#2d8a80] border-2 border-[#0f1f33] shadow-[0_0_10px_rgba(45,138,128,0.4)]" />
                </div>

                {/* Card */}
                <div className="flex-1 rounded-2xl bg-white/[0.05] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.08] p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2d8a80]/15 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-[#2d8a80]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70">
                        STEP {step.number}
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-white/55 leading-relaxed">
                    {step.description}
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
