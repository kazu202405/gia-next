"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Clock, ShieldCheck, BarChart3 } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function BehavioralCta() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bcta-content",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bcta-content",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // Floating blobs
      gsap.to(".bcta-blob-1", {
        y: -20,
        x: 15,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".bcta-blob-2", {
        y: 25,
        x: -20,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative bg-[#0f1f33] py-28 md:py-36 overflow-hidden"
    >
      {/* Wave Divider */}
      <div className="absolute top-0 left-0 right-0 h-[120px] overflow-hidden -translate-y-[119px]">
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <path
            d="M0,40 Q360,100 720,40 T1440,40 L1440,120 L0,120 Z"
            fill="#0f1f33"
          />
        </svg>
      </div>

      {/* Gradient mesh blobs */}
      <div className="bcta-blob-1 absolute top-[10%] left-[10%] w-[400px] h-[400px] rounded-full bg-[#2d8a80]/10 blur-[100px] pointer-events-none" />
      <div className="bcta-blob-2 absolute bottom-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-[#c8a55a]/8 blur-[80px] pointer-events-none" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bcta-content text-center">
          {/* Decorative line */}
          <div className="w-12 h-[2px] bg-gradient-to-r from-[#2d8a80] to-[#c8a55a] mx-auto mb-8" />

          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-6 leading-tight">
            まずは3分の診断から、
            <br className="sm:hidden" />
            始めませんか？
          </h2>
          <p className="text-lg text-white/60 leading-relaxed mb-4">
            18問の行動診断で、あなたの組織の「行動の癖」を可視化します。
          </p>
          <p className="text-sm text-white/40 mb-10">
            診断後すぐに結果がわかります。
          </p>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mb-12">
            <div className="flex items-center gap-2.5 text-white/50">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm">所要時間 3分</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/50">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <span className="text-sm">その場で結果表示</span>
            </div>
            <div className="flex items-center gap-2.5 text-white/50">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-sm">営業なし</span>
            </div>
          </div>

          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full bg-[#2d8a80]/25 animate-[pulse-ring_3s_ease-out_infinite]" />
            <a
              href="/diagnostic"
              className="btn-glow group relative inline-flex items-center gap-3 px-10 py-5 bg-[#2d8a80] text-white font-bold text-lg rounded-full hover:bg-[#247a70] transition-all duration-300 shadow-2xl hover:shadow-[0_20px_60px_rgba(45,138,128,0.3)] hover:-translate-y-1"
            >
              無料で行動診断を受ける
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
