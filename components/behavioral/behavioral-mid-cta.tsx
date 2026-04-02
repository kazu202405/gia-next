"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Clock, ShieldCheck } from "lucide-react";
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
            人の価値を最大化する仕組み、
            <br />
            一緒につくりませんか？
          </h2>
          <p className="text-base text-slate-500 leading-relaxed mb-8 max-w-xl mx-auto">
            思考と事業を整理するだけで見えてくることがあります。まずは現状を一緒に整理してみませんか。
          </p>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-5 md:gap-8 mb-8">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">相談は無料</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-sm">相談だけで終わってもOK</span>
            </div>
          </div>

          <a
            href="https://page.line.me/131liqrt"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow group inline-flex items-center gap-3 px-8 py-4 bg-[#06C755] text-white font-bold text-base rounded-full hover:bg-[#05b34c] transition-all duration-300 shadow-lg hover:shadow-[0_12px_40px_rgba(6,199,85,0.25)] hover:-translate-y-0.5"
          >
            LINEで気軽に相談する
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
          <p className="mt-3 text-xs text-slate-400">友だち追加するだけ / 営業トークは一切なし</p>
        </div>
      </div>
    </section>
  );
}
