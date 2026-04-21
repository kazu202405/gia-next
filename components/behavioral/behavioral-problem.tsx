"use client";

import { useEffect, useRef } from "react";
import { ClipboardList, Search, PenTool, Settings } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: ClipboardList,
    number: "01",
    title: "AI導入の前に業務整理",
    description:
      "ツール導入ではなく、まず会社の仕事を整理します。業務フローが見えていない状態でAIを入れても成果は出ません。",
  },
  {
    icon: Search,
    number: "02",
    title: "AIが使える業務を特定",
    description:
      "どの業務にAIが使えるのかを明確にします。「とりあえずAI」ではなく、効果が出るポイントだけに絞る。",
  },
  {
    icon: PenTool,
    number: "03",
    title: "DX設計",
    description:
      "AIだけでなく、業務効率化の仕組み全体を設計します。仕組みに任せるところ、人にしかできないところを整理。",
  },
  {
    icon: Settings,
    number: "04",
    title: "アプリ・システムで実装",
    description:
      "設計した仕組みを、顧客管理・営業支援・業務効率化アプリとして社内で実装。外注の手間もコストも抑えられます。",
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

      // 接続線を左から右へ描画
      gsap.fromTo(
        ".bp-connector",
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bp-stepper",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // 各ステップノードを順番にフェードイン
      gsap.fromTo(
        ".bp-step",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.18,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bp-stepper",
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
      className="relative overflow-hidden py-24 md:py-32 bg-[#f8f7f5]"
    >
      {/* Top glow separator */}
      <div className="section-glow-top" />

      {/* Flowing wave shape - left */}
      <div
        className="pointer-events-none absolute top-0 left-0 w-[40%] h-full hidden md:block"
        style={{
          background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 1100' preserveAspectRatio='none'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0%25' stop-color='%232d8a80' stop-opacity='0.08'/%3E%3Cstop offset='100%25' stop-color='%232d8a80' stop-opacity='0'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M0,0 C200,100 80,300 180,500 C280,700 60,900 200,1100 L0,1100 Z' fill='url(%23g)'/%3E%3C/svg%3E") no-repeat`,
          backgroundSize: "100% 100%",
        }}
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bp-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            仕組み化のアプローチ
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0f1f33] mb-4">
            アプリだけ作るのではなく、
            <br className="hidden sm:block" />
            仕組みまで整える。
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            属人的な業務を仕組み化し、現場が自然に回る状態をつくる。
            <br className="hidden sm:block" />
            それが、選ばれる理由づくりの土台です。
          </p>
        </div>

        {/* Process Stepper (desktop) — 2x2グリッド + 接続線 */}
        <div className="bp-stepper relative hidden md:block max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-x-16 gap-y-10">
            {features.map((item, i) => (
              <div
                key={item.number}
                className="bp-step group flex items-start gap-5"
              >
                {/* ステップサークル + 番号 */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="relative z-10 w-12 h-12 rounded-full border-2 border-[#2d8a80] bg-[#f8f7f5] flex items-center justify-center transition-all duration-300 group-hover:bg-[#2d8a80]/10 group-hover:scale-110">
                    <item.icon className="w-5 h-5 text-[#2d8a80]" />
                  </div>
                  {i < features.length - 1 && (
                    <div className="w-px h-6 bg-gradient-to-b from-[#2d8a80]/30 to-transparent mt-2 hidden" />
                  )}
                </div>

                {/* テキスト */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70">
                    STEP {item.number}
                  </span>
                  <h3 className="text-base font-bold text-[#0f1f33] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* 中央の接続矢印 */}
          <div className="bp-connector absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center">
            <div className="w-px h-full bg-gradient-to-b from-[#2d8a80]/20 via-[#2d8a80]/40 to-[#c8a55a]/20" />
          </div>
        </div>

        {/* Mobile: 縦型シンプルステッパー */}
        <div className="bp-stepper md:hidden relative max-w-lg mx-auto pl-10">
          {/* 縦線 */}
          <div className="bp-connector absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-[#2d8a80] to-[#c8a55a] origin-top" />

          <div className="space-y-10">
            {features.map((item) => (
              <div
                key={item.number}
                className="bp-step relative flex gap-5"
              >
                {/* ドット */}
                <div className="absolute -left-10 top-1 z-10 w-9 h-9 rounded-full border-2 border-[#2d8a80] bg-[#f8f7f5] flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-[#2d8a80]" />
                </div>

                <div>
                  <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70">
                    {item.number}
                  </span>
                  <h3 className="text-base font-bold text-[#0f1f33] mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {item.description}
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
