"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

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

      // Floating blob drift
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
              {/* Vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-slate-900/10 pointer-events-none" />
            </div>
          </div>

          {/* Content */}
          <div className="about-content relative z-10">
            <span className="about-text shimmer-badge inline-block text-sm font-semibold text-[#c8a55a] tracking-widest mb-3 px-1">
              代表メッセージ
            </span>
            <h2 className="about-title font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-6">
              経営者の孤独を、
              <br />
              なくしたい。
            </h2>

            <p className="about-text text-lg text-slate-600 leading-relaxed mb-6">
              私自身、中小企業の経営に携わる中で、
              <br className="hidden md:block" />
              すべてを一人で背負い込む苦しさを経験しました。
            </p>
            <p className="about-text text-lg text-slate-600 leading-relaxed mb-6">
              「社長がいなくても回る会社」——
              <br className="hidden md:block" />
              それは社長を不要にすることではなく、
              <br className="hidden md:block" />
              社長が本当にやるべきことに集中できる環境をつくること。
            </p>
            <p className="about-text text-lg text-slate-600 leading-relaxed mb-8">
              行動科学の知見を通じて、
              <br className="hidden md:block" />
              人が自然に動く仕組みを一緒につくりましょう。
            </p>
            <div className="about-text">
              <div className="w-8 h-[2px] bg-gradient-to-r from-[#2d8a80] to-[#c8a55a] mb-4" />
              <p className="text-base font-semibold text-slate-800">
                株式会社Global Information Academy
              </p>
              <p className="text-sm text-slate-500 mt-1">代表</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
