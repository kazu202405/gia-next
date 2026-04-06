"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function SalonLP() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(".salon-badge", { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, delay: 0.3 })
        .fromTo(".salon-h1", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.2")
        .fromTo(".salon-sub", { y: 15, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.3")
        .fromTo(".salon-scroll-hint", { opacity: 0 }, { opacity: 1, duration: 0.6 }, "-=0.1");

      // Floating blobs
      gsap.to(".salon-blob-1", { y: -20, x: 10, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.to(".salon-blob-2", { y: 15, x: -12, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" });

      // Section 2 - contents
      gsap.fromTo(
        ".content-heading",
        { y: 25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, scrollTrigger: { trigger: ".section-contents", start: "top 80%" } }
      );
      gsap.fromTo(
        ".content-item",
        { y: 15, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, scrollTrigger: { trigger: ".section-contents", start: "top 75%" } }
      );

      // Section 3 - pricing
      gsap.fromTo(
        ".price-inner",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, scrollTrigger: { trigger: ".section-pricing", start: "top 80%" } }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="bg-[var(--gia-navy)]">
      {/* ===== Hero ===== */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-[var(--gia-navy)] pt-24 sm:pt-16">
        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="salon-blob-1 absolute top-[15%] left-[10%] w-[min(450px,50vw)] h-[min(450px,50vw)] rounded-full bg-[#2d8a80]/10 blur-[100px]" />
          <div className="salon-blob-2 absolute bottom-[20%] right-[10%] w-[min(350px,40vw)] h-[min(350px,40vw)] rounded-full bg-[#c8a55a]/8 blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <span
            className="salon-badge inline-flex items-center px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white/50 tracking-widest uppercase mb-10"
            style={{ opacity: 0 }}
          >
            Online Salon
          </span>

          <h1
            className="salon-h1 font-[family-name:var(--font-noto-serif-jp)] text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.2] tracking-tight mb-6"
            style={{ opacity: 0 }}
          >
            AI時代に、
            <br />
            選ばれる<span className="text-[var(--gia-teal-light)]">魅力</span>を設計する。
          </h1>

          <p
            className="salon-sub text-white/40 text-sm sm:text-base leading-relaxed max-w-lg mx-auto"
            style={{ opacity: 0 }}
          >
            印象、距離感、伝え方。
            <br />
            心理学とAIで「選ばれる理由」を整えるサロンです。
          </p>
        </div>

        {/* Scroll hint */}
        <div className="salon-scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2" style={{ opacity: 0 }}>
          <div className="w-px h-8 bg-white/10 relative overflow-hidden rounded-full">
            <div
              className="absolute top-0 left-0 w-full h-3 bg-gradient-to-b from-white/40 to-transparent"
              style={{ animation: "scroll-line 2s ease-in-out infinite" }}
            />
          </div>
        </div>

        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--gia-warm-gray)] to-transparent z-10" />
      </section>

      {/* ===== Contents ===== */}
      <section className="section-contents bg-[var(--gia-warm-gray)] py-24 sm:py-32 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          {/* セクションヘッダー */}
          <div className="content-heading text-center mb-16 sm:mb-20">
            <span className="block text-[11px] text-[var(--gia-teal)] tracking-[0.2em] uppercase font-medium mb-4">
              About
            </span>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl lg:text-[2.2rem] font-semibold text-[var(--gia-navy)] leading-tight">
              どんなサロン？
            </h2>
          </div>

          {/* 横並びレイアウト */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
            {[
              {
                num: "01",
                title: "LINEで完結",
                desc: "オープンチャットで配信。アプリもログインも不要。難しい操作は一切ありません。",
              },
              {
                num: "02",
                title: "ラジオ感覚の\n動画配信",
                desc: "耳だけでもいい。通勤中でも、作業中でも。選ばれる人の行動心理を、短い動画で定期配信します。",
              },
              {
                num: "03",
                title: "事例と、\nすぐ使える気づき",
                desc: "リアルな事例をもとに「自分はどうか？」と考えるきっかけを。知識より気づきを届けます。",
              },
              {
                num: "04",
                title: "恋愛も営業も、\n本質は同じ",
                desc: "誰にでも好かれる正解はない。でも、距離感、信頼の作り方、印象の残し方には構造がある。",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="content-item group relative px-6 lg:px-8 py-10 sm:py-8 lg:py-0 border-l-0 overflow-hidden"
                style={{ opacity: 0 }}
              >
                {/* 背景の大きなナンバー装飾 */}
                <span className="absolute -top-3 -right-1 text-[4.8rem] font-bold leading-none text-[var(--gia-navy)]/[0.03] select-none pointer-events-none font-[family-name:var(--font-noto-serif-jp)] transition-colors duration-500 group-hover:text-[var(--gia-teal)]/[0.08]">
                  {item.num}
                </span>

                {/* テキスト */}
                <div className="relative z-10">
                  <h3 className="text-[var(--gia-navy)] font-semibold text-[15px] leading-relaxed whitespace-pre-line mb-4 min-h-[2.8em] flex items-end">
                    {item.title}
                  </h3>
                  <div className="w-1/2 h-px bg-[var(--gia-navy)]/10 mb-4" />
                  <p className="text-[var(--gia-navy)]/50 text-[13px] leading-[1.85]">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Pricing + CTA ===== */}
      <section className="section-pricing bg-[var(--gia-navy)] py-20 sm:py-28">
        <div className="price-inner max-w-md mx-auto px-6 text-center" style={{ opacity: 0 }}>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-semibold text-white mb-10">
            料金
          </h2>

          {/* Price card */}
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-white/8 p-8 sm:p-10 mb-8">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-white/30 text-sm">¥</span>
              <span className="text-5xl font-bold text-white tracking-tight">990</span>
              <span className="text-white/30 text-sm">/月</span>
            </div>
            <p className="text-white/25 text-xs mb-8">年一括 ¥11,880（税込）</p>

            <div className="h-px bg-white/8 mb-8" />

            <button
              disabled
              className="w-full px-8 py-3.5 bg-[var(--gia-teal)] text-white text-sm font-medium rounded-full opacity-50 cursor-not-allowed"
            >
              オープンチャット準備中
            </button>
          </div>

          <p className="text-white/20 text-xs">
            紹介優先でご案内しています
          </p>
        </div>
      </section>
    </div>
  );
}
