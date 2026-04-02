"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const principles = [
  {
    quote: "属人的な業務こそ仕組み化する。それが、人の価値を最大化する第一歩。",
    insight: "まず「見える化」が出発点。",
  },
  {
    quote: "AIは万能ではない。人にしかできないことを際立たせるために使うべき。",
    insight: "AIは手段、目的は人の価値。",
  },
  {
    quote: "選ばれる理由は、思考と事業の整理の中から見えてくる。",
    insight: "整えることで、強みが伝わる。",
  },
];

export function About() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".about-image-frame",
        { x: -60, opacity: 0, scale: 0.95 },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-grid",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".about-image",
        { x: -40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          delay: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-grid",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".about-title",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-content",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".about-text",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          delay: 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-content",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.to(".about-blob-1", {
        y: -20,
        x: 15,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".about-blob-2", {
        y: 15,
        x: -10,
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".about-image", {
        y: -40,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.fromTo(
        ".about-principle",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".about-principles",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.to(".about-highlight", {
        backgroundSize: "100% 40%",
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".about-highlight",
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="about"
      className="py-24 md:py-32 bg-[#f8f7f5] relative overflow-hidden"
    >
      {/* Top glow separator */}
      <div className="section-glow-top" />

      {/* Floating gradient blobs */}
      <div className="about-blob-1 absolute top-[10%] left-[5%] w-[350px] h-[350px] rounded-full bg-[#2d8a80]/5 blur-[100px] pointer-events-none hidden md:block" />
      <div className="about-blob-2 absolute bottom-[10%] right-[5%] w-[300px] h-[300px] rounded-full bg-[#c8a55a]/5 blur-[80px] pointer-events-none hidden md:block" />

      {/* Decorative quotation mark */}
      <svg
        className="absolute top-16 right-[15%] w-[200px] h-[200px] opacity-[0.04] pointer-events-none hidden md:block"
        viewBox="0 0 100 100"
        fill="#2d8a80"
      >
        <text
          x="0"
          y="85"
          fontSize="120"
          fontFamily="Georgia, serif"
          fontWeight="bold"
        >
          &ldquo;
        </text>
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="about-grid grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image with Frame */}
          <div className="relative">
            <div className="about-image-frame border-gradient-animated absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-full h-full rounded-3xl bg-gradient-to-br from-[#2d8a80]/5 to-[#c8a55a]/5" />
            <div className="about-image relative h-[400px] md:h-[480px] rounded-3xl overflow-hidden shadow-lg">
              <Image
                src="/images/about.jpg"
                alt="代表メッセージ"
                fill
                className="object-cover transition-transform duration-700 ease-out hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-slate-900/10 pointer-events-none" />
            </div>
          </div>

          {/* Content */}
          <div className="about-content relative z-10">
            <span className="about-text shimmer-badge inline-block text-sm font-semibold text-[#c8a55a] tracking-widest mb-3 px-1">
              代表メッセージ
            </span>
            <h2 className="about-title font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-6">
              選ばれる理由は、
              <br />
              仕組みでつくる。
            </h2>

            <p className="about-text text-lg text-slate-600 leading-relaxed mb-6">
              いいサービスがあるのに、選ばれる理由が伝わらない。
              <br className="hidden md:block" />
              その原因の多くは、属人的な業務に追われて思考が整理できていないことにあります。
            </p>
            <p className="about-text text-lg text-slate-600 leading-relaxed mb-6">
              私たちの仕事は、AIを売ることではなく、
              <span
                className="about-highlight"
                style={{
                  backgroundImage: "linear-gradient(90deg, #2d8a80, #c8a55a)",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "left bottom",
                  backgroundSize: "0% 40%",
                }}
              >人にしかできない価値を最大化すること</span>。
              <br className="hidden md:block" />
              社長の左腕として、右腕や現場とも伴走しながら、
              <br className="hidden md:block" />
              思考と事業を整え、選ばれる理由を設計します。
            </p>
            <p className="about-text text-lg text-slate-600 leading-relaxed mb-8">
              ツール導入で終わらない。コンサルで終わらない。
              <br className="hidden md:block" />
              「相談したら、選ばれる理由が見えるところまでやってくれた」を目指しています。
            </p>
            <div className="about-text">
              <div className="w-8 h-[2px] bg-gradient-to-r from-[#2d8a80] to-[#c8a55a] mb-4" />
              <p className="text-base font-semibold text-slate-800">
                株式会社Global Information Academy
              </p>
              <p className="text-sm text-slate-500 mt-1"></p>
            </div>
          </div>
        </div>

        {/* GIAの考え方 */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-semibold text-slate-800 mb-3">
              GIAが大切にしている3つの考え方
            </h3>
            <p className="text-base text-slate-500">
              選ばれる理由をつくるために、私たちがまず大切にすること
            </p>
          </div>
          <div className="about-principles grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {principles.map((p, i) => (
              <div
                key={i}
                className="about-principle p-6 rounded-2xl bg-white/80 border border-slate-200/60 transition-all duration-300 hover:shadow-md"
              >
                <p className="text-sm text-slate-700 leading-relaxed mb-4 font-medium">
                  &ldquo;{p.quote}&rdquo;
                </p>
                <div className="w-8 h-px bg-[#2d8a80]/40 mb-3" />
                <p className="text-sm text-[#2d8a80] font-medium">
                  {p.insight}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
