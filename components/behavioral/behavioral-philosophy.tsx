"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const principles = [
  {
    quote: "人間の意志力は、有限のリソースである。",
    source: "— Roy Baumeister, Ego Depletion Theory",
    insight: "だから「頑張れ」ではなく、環境を変える。",
  },
  {
    quote: "選択肢の提示方法が、人の行動を決定する。",
    source: "— Richard Thaler, Nudge Theory",
    insight: "だから「正しいこと」を教えるのではなく、自然に選ばれる設計をする。",
  },
  {
    quote: "小さな行動の積み重ねが、アイデンティティを変える。",
    source: "— BJ Fogg, Tiny Habits",
    insight: "だから大改革ではなく、小さな習慣から始める。",
  },
];

export function BehavioralPhilosophy() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bph-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bph-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bph-main-quote",
        { y: 40, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bph-main-quote",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bph-principle",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bph-principles",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Floating decoration
      gsap.to(".bph-blob-1", {
        y: -20,
        x: 15,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
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
      {/* Decorative elements */}
      <div className="bph-blob-1 absolute top-[15%] right-[10%] w-[350px] h-[350px] rounded-full bg-[#c8a55a]/5 blur-[100px] pointer-events-none" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
        <div className="bph-header text-center mb-12">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#c8a55a] mb-4">
            PHILOSOPHY
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            私たちの根底にある思想
          </h2>
        </div>

        {/* Main quote */}
        <div className="bph-main-quote text-center mb-16 max-w-3xl mx-auto">
          <div className="relative inline-block">
            {/* Decorative quote mark */}
            <span className="absolute -top-8 -left-4 text-6xl text-[#2d8a80]/20 font-serif leading-none">
              &ldquo;
            </span>
            <p className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl md:text-4xl font-semibold text-white leading-relaxed">
              人間は変わらない。
              <br />
              だから、
              <Link href="/stories/knowledge" className="text-[#2d8a80] hover:text-[#3aada1] underline decoration-[#2d8a80]/40 hover:decoration-[#3aada1]/80 underline-offset-4 transition-all duration-300">環境</Link>
              を変える。
            </p>
            <span className="absolute -bottom-4 -right-4 text-6xl text-[#2d8a80]/20 font-serif leading-none">
              &rdquo;
            </span>
          </div>
          <p className="text-base text-white/50 mt-8 max-w-xl mx-auto leading-relaxed">
            人の意志や根性に頼るマネジメントは、必ず限界がくる。
            <br />
            行動科学は、人を変えるのではなく、人が自然に動く環境をデザインする学問です。
          </p>
        </div>

        {/* Principles */}
        <div className="bph-principles grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {principles.map((p, i) => (
            <div
              key={i}
              className="bph-principle p-6 rounded-2xl bg-white/[0.05] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.08]"
            >
              <p className="text-sm text-white/80 leading-relaxed mb-3 font-medium italic">
                &ldquo;{p.quote}&rdquo;
              </p>
              <p className="text-[10px] text-white/30 tracking-wide mb-4">
                {p.source}
              </p>
              <div className="w-8 h-px bg-[#2d8a80]/40 mb-3" />
              <p className="text-sm text-[#2d8a80] font-medium">
                {p.insight}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
