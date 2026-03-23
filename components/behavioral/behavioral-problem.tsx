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
      "AIだけでなく、業務効率化の仕組み全体を設計します。デジタル化すべきところ、人が担うべきところを整理。",
  },
  {
    icon: Settings,
    number: "04",
    title: "必要ならシステム開発",
    description:
      "業務整理の結果、自動化やシステム化が必要であれば社内で対応可能。外注の手間もコストも抑えられます。",
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
        ".bp-card",
        { y: 40, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bp-grid",
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

      {/* Floating blob decoration */}
      <div
        className="pointer-events-none absolute -top-20 -right-32 w-[420px] h-[420px] rounded-full opacity-30 animate-[mesh-drift_18s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, rgba(45,138,128,0.12) 0%, rgba(200,165,90,0.06) 50%, transparent 75%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bp-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            右腕のつくり方
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0f1f33] mb-4">
            人を雇うのではなく、
            <br className="hidden sm:block" />
            仕組みで右腕をつくる。
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            業務を整理し、仕組み化する。それだけで「社長がいなくても回る状態」は作れます。
          </p>
        </div>

        {/* Feature Cards */}
        <div className="bp-grid grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((item) => (
            <div
              key={item.number}
              className="bp-card group relative p-8 rounded-3xl bg-white/80 backdrop-blur-sm border border-slate-200/60 transition-all duration-300 hover:border-[#2d8a80]/30 hover:shadow-[0_8px_32px_rgba(45,138,128,0.1)]"
            >
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-[#2d8a80]/10 flex items-center justify-center transition-all duration-300 group-hover:bg-[#2d8a80]/20 group-hover:scale-110">
                    <item.icon className="w-7 h-7 text-[#2d8a80]" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-[#c8a55a]/70 mb-1 block">
                    {item.number}
                  </span>
                  <h3 className="text-lg font-bold text-[#0f1f33] mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
