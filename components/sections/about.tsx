"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function About() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 画像フレームが先にフェードイン
      gsap.fromTo(
        ".about-image-frame",
        { x: -60, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-grid",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // 画像が少し遅れてフェードイン
      gsap.fromTo(
        ".about-image",
        { x: -40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          delay: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-grid",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // タイトル
      gsap.fromTo(
        ".about-title",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-content",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // 段落とボタンがスタガーでフェードイン
      gsap.fromTo(
        ".about-text",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.1,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-content",
            start: "top 90%",
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
    <section ref={containerRef} id="about" className="py-24 md:py-32 bg-slate-50 relative overflow-hidden">
      {/* SVG装飾シェイプ - 左上の円 */}
      <svg
        className="absolute -top-20 -left-20 w-[400px] h-[400px] opacity-20 pointer-events-none hidden md:block"
        viewBox="0 0 400 400"
        fill="none"
      >
        <circle cx="200" cy="200" r="150" stroke="#3b82f6" strokeWidth="1" />
        <circle cx="200" cy="200" r="120" stroke="#3b82f6" strokeWidth="0.5" />
        <circle cx="200" cy="200" r="180" stroke="#94a3b8" strokeWidth="0.5" />
      </svg>

      {/* SVG装飾シェイプ - 右側の斜めライン */}
      <svg
        className="absolute top-1/4 -right-10 w-[300px] h-[400px] opacity-10 pointer-events-none hidden md:block"
        viewBox="0 0 300 400"
        fill="none"
      >
        <line x1="0" y1="400" x2="300" y2="0" stroke="#3b82f6" strokeWidth="1" />
        <line x1="40" y1="400" x2="340" y2="0" stroke="#3b82f6" strokeWidth="0.5" />
        <line x1="80" y1="400" x2="380" y2="0" stroke="#94a3b8" strokeWidth="0.5" />
      </svg>

      {/* SVG装飾シェイプ - 左下の四角 */}
      <svg
        className="absolute -bottom-10 left-1/4 w-[200px] h-[200px] opacity-10 pointer-events-none hidden md:block"
        viewBox="0 0 200 200"
        fill="none"
      >
        <rect x="20" y="20" width="160" height="160" stroke="#3b82f6" strokeWidth="1" transform="rotate(15 100 100)" />
        <rect x="40" y="40" width="120" height="120" stroke="#94a3b8" strokeWidth="0.5" transform="rotate(15 100 100)" />
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="about-grid grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image with Frame */}
          <div className="relative">
            {/* 背景フレーム - 画像の後ろにずらして配置 */}
            <div
              className="about-image-frame absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-full h-full rounded-2xl border-2 border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-slate-100/50"
            />
            {/* メイン画像 */}
            <div className="about-image relative h-[400px] md:h-[480px] rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/images/about.jpg"
                alt="私たちについて"
                fill
                className="object-cover transition-transform duration-500 ease-out hover:scale-105"
              />
              {/* 画像オーバーレイ */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Content */}
          <div className="about-content relative z-10">
            <h2 className="about-title text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-6">
              私たちについて
            </h2>

            <p className="about-text text-lg text-slate-600 leading-relaxed mb-6">
              私たち株式会社Global Information Academy（GIA）は、<br />
              「人の力を引き出す」を合言葉に、システム開発と<br />
              心理学・脳科学の知見を融合させ、仕組みと人の成長の<br />
              両面からビジネスを支えるDXパートナーです。
            </p>
            <p className="about-text text-lg text-slate-600 leading-relaxed mb-8">
              単なる仕組みづくりではなく、経営者や現場の声に寄り添い、<br />
              人の力が最大限に活きる環境をともに築きます。<br />
              技術と心理の両面から、お客様のビジネスを次のステージへ導きます。
            </p>
            <div className="about-text">
              <Button asChild variant="outline" size="lg" className="text-slate-800 border-slate-800 hover:bg-slate-800 hover:text-white transition-all duration-300">
                <Link href="/about">
                  詳しく見る
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Triangle - 右下 */}
      <div
        className="absolute bottom-0 right-0 w-[min(34vw,520px)] h-[min(34vw,520px)] opacity-90 pointer-events-none hidden md:block"
        style={{
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 41, 59, 0.12) 100%)",
          clipPath: "polygon(100% 0%, 100% 100%, 0% 100%)",
          backdropFilter: "blur(8px)",
        }}
      />
    </section>
  );
}
