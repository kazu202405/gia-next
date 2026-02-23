"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Clock, ShieldCheck, BarChart3 } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function BehavioralMidCta() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".midcta-content",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".midcta-content",
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
      className="relative py-20 md:py-24 bg-[#f8f7f5] overflow-hidden"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="midcta-content text-center">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl md:text-4xl font-semibold text-[#0f1f33] mb-4 leading-tight">
            まずは3分の診断で
            <br />
            組織の「行動の癖」を可視化しませんか？
          </h2>
          <p className="text-base text-slate-500 leading-relaxed mb-8 max-w-xl mx-auto">
            18問の設問に答えるだけで、6領域のスコアがわかります。
          </p>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-5 md:gap-8 mb-8">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">所要時間 3分</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">その場で結果表示</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm">営業なし</span>
            </div>
          </div>

          <a
            href="/diagnostic"
            className="btn-glow group inline-flex items-center gap-3 px-8 py-4 bg-[#2d8a80] text-white font-bold text-base rounded-full hover:bg-[#247a70] transition-all duration-300 shadow-lg hover:shadow-[0_12px_40px_rgba(45,138,128,0.25)] hover:-translate-y-0.5"
          >
            無料診断をしてみる
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>
    </section>
  );
}
