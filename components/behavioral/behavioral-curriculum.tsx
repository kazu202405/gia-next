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
    title: "アプリ実装 / 運用定着",
    description:
      "設計した仕組みを、顧客管理・営業支援アプリとして実装。外注ではなく社内で対応するので、現場で使われ続ける形まで伴走します。",
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

      // 中央縦線を描画
      gsap.fromTo(
        ".bc-center-line",
        { scaleY: 0 },
        {
          scaleY: 1,
          duration: 1.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bc-zigzag",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // 左から入るステップ
      gsap.fromTo(
        ".bc-step-left",
        { x: -50, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.3,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bc-zigzag",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // 右から入るステップ
      gsap.fromTo(
        ".bc-step-right",
        { x: 50, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.3,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bc-zigzag",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // タイムラインドットのスケール
      gsap.fromTo(
        ".bc-dot",
        { scale: 0 },
        {
          scale: 1,
          duration: 0.4,
          stagger: 0.2,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: ".bc-zigzag",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // モバイル用
      gsap.fromTo(
        ".bc-mobile-step",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bc-mobile-timeline",
            start: "top 90%",
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
      className="relative overflow-hidden py-24 md:py-32 bg-[#f8f7f5]"
    >
      {/* Dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='1' fill='%230f1f33' opacity='0.04'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="bc-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            現場で回る仕組みができるまで
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0f1f33] mb-4">
            相談からアプリ実装まで、4ステップ
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            いきなりアプリ開発ではありません。
            <br className="hidden sm:block" />
            相談から始めて、必要なことだけを順番に。
          </p>
        </div>

        {/* Desktop: ジグザグタイムライン */}
        <div className="bc-zigzag relative hidden md:block max-w-4xl mx-auto">
          {/* 中央縦線 */}
          <div className="bc-center-line absolute left-1/2 -translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-[#2d8a80]/60 via-[#2d8a80]/30 to-[#c8a55a]/40 origin-top" />

          <div className="space-y-16">
            {steps.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div
                  key={step.number}
                  className="relative grid grid-cols-[1fr_48px_1fr] items-center"
                >
                  {/* 左側コンテンツ or 空白 */}
                  <div className={isLeft ? "text-right pr-8" : ""}>
                    {isLeft && (
                      <div className={`bc-step-left`}>
                        <span className="text-6xl font-bold text-[#0f1f33]/[0.04] absolute -top-4 right-8 pointer-events-none select-none">
                          {step.number}
                        </span>
                        <div className="flex items-center justify-end gap-2 mb-2">
                          <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70">
                            STEP {step.number}
                          </span>
                          <step.icon className="w-4 h-4 text-[#2d8a80]" />
                        </div>
                        <h3 className="text-lg font-bold text-[#0f1f33] mb-2">
                          {step.title}
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 中央ドット */}
                  <div className="flex justify-center">
                    <div className="bc-dot w-3 h-3 rounded-full bg-[#2d8a80] shadow-[0_0_8px_rgba(45,138,128,0.3)]" />
                  </div>

                  {/* 右側コンテンツ or 空白 */}
                  <div className={!isLeft ? "pl-8" : ""}>
                    {!isLeft && (
                      <div className={`bc-step-right`}>
                        <span className="text-6xl font-bold text-[#0f1f33]/[0.04] absolute -top-4 left-8 pointer-events-none select-none">
                          {step.number}
                        </span>
                        <div className="flex items-center gap-2 mb-2">
                          <step.icon className="w-4 h-4 text-[#2d8a80]" />
                          <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70">
                            STEP {step.number}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-[#0f1f33] mb-2">
                          {step.title}
                        </h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: シンプル縦タイムライン（カードなし） */}
        <div className="bc-mobile-timeline md:hidden relative max-w-lg mx-auto pl-10">
          {/* 縦線 */}
          <div className="absolute left-[14px] top-0 bottom-0 w-px bg-gradient-to-b from-[#2d8a80]/60 via-[#2d8a80]/30 to-[#c8a55a]/40" />

          <div className="space-y-10">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bc-mobile-step relative"
              >
                {/* ドット */}
                <div className="absolute -left-10 top-1 w-3 h-3 rounded-full bg-[#2d8a80] shadow-[0_0_10px_rgba(45,138,128,0.4)]" />

                <div className="flex items-center gap-2 mb-2">
                  <step.icon className="w-4 h-4 text-[#2d8a80]" />
                  <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70">
                    STEP {step.number}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0f1f33] mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
