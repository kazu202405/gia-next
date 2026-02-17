"use client";

import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      // Entrance sequence
      tl.fromTo(
        ".hero-blob",
        { scale: 0.3, opacity: 0 },
        { scale: 1, opacity: 1, duration: 2, stagger: 0.3, ease: "power1.out" }
      )
        .fromTo(
          ".hero-badge",
          { y: 30, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 0.8 },
          "-=1.2"
        )
        .fromTo(
          ".hero-h1-line",
          { y: 80, opacity: 0, rotateX: 20 },
          { y: 0, opacity: 1, rotateX: 0, duration: 0.9, stagger: 0.15 },
          "-=0.5"
        )
        .fromTo(
          ".hero-sub",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7 },
          "-=0.4"
        )
        .fromTo(
          ".hero-cta-wrapper",
          { y: 30, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6 },
          "-=0.2"
        )
        .fromTo(
          ".hero-scroll-hint",
          { opacity: 0 },
          { opacity: 1, duration: 1 },
          "-=0.2"
        );

      // Floating blob animations
      gsap.to(".hero-blob-1", {
        y: -35,
        x: 20,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".hero-blob-2", {
        y: 30,
        x: -25,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".hero-blob-3", {
        y: -25,
        x: 15,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // Parallax on scroll
      gsap.to(".hero-content", {
        y: -80,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });

      gsap.to(".hero-blobs-container", {
        y: -40,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Video Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/images/hero.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay with depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1f33]/40 via-[#0f1f33]/55 to-[#0f1f33]/80 z-[1]" />

      {/* Animated gradient mesh blobs */}
      <div className="hero-blobs-container absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        <div className="hero-blob hero-blob-1 absolute top-[15%] left-[15%] w-[min(500px,50vw)] h-[min(500px,50vw)] rounded-full bg-[#2d8a80]/20 blur-[100px]" />
        <div className="hero-blob hero-blob-2 absolute bottom-[20%] right-[15%] w-[min(400px,45vw)] h-[min(400px,45vw)] rounded-full bg-[#c8a55a]/12 blur-[80px]" />
        <div className="hero-blob hero-blob-3 absolute top-[40%] left-[45%] w-[min(550px,55vw)] h-[min(550px,55vw)] rounded-full bg-[#2d8a80]/10 blur-[120px]" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 z-[3] pointer-events-none overflow-hidden">
        {[
          { top: "12%", left: "8%", size: "3px", delay: 0, dur: 6 },
          { top: "25%", left: "85%", size: "2px", delay: 1, dur: 7 },
          { top: "45%", left: "12%", size: "2px", delay: 0.5, dur: 5 },
          { top: "60%", left: "78%", size: "3px", delay: 2, dur: 8 },
          { top: "75%", left: "25%", size: "2px", delay: 1.5, dur: 6 },
          { top: "35%", left: "65%", size: "2px", delay: 0.8, dur: 7 },
          { top: "80%", left: "55%", size: "3px", delay: 2.5, dur: 5 },
          { top: "18%", left: "50%", size: "2px", delay: 1.2, dur: 9 },
        ].map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/25"
            style={{
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              animation: `float ${p.dur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Decorative ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] pointer-events-none">
        <div
          className="w-[min(700px,90vw)] h-[min(700px,90vw)] rounded-full border border-white/[0.04]"
          style={{ animation: "spin-slow 60s linear infinite" }}
        />
      </div>

      {/* Content */}
      <div className="hero-content relative z-[4] max-w-4xl mx-auto px-4 text-center pt-16">
        <span className="hero-badge inline-block text-sm font-semibold tracking-[0.2em] mb-8 rounded-full px-6 py-2.5 bg-white/[0.08] backdrop-blur-md border border-white/[0.12] text-white/90">
          売上3,000万〜10億の経営者様へ
        </span>

        <h1 className="font-[family-name:var(--font-noto-serif-jp)] text-4xl sm:text-5xl md:text-7xl font-semibold text-white leading-[1.1] mb-8 tracking-tight [perspective:1000px]">
          <span className="hero-h1-line block">会社が自然と回る</span>
          <span className="hero-h1-line block mt-2">仕組みをつくる。</span>
        </h1>

        <p className="hero-sub text-lg sm:text-xl text-white/75 font-normal leading-relaxed mb-12 max-w-2xl mx-auto">
          業務フローを整理し、社長がいなくても現場が動く。
          <br className="hidden sm:block" />
          忙しさから抜け出す仕組みづくりを、伴走します。
        </p>

        <div className="hero-cta-wrapper relative inline-block">
          {/* Pulse ring behind CTA */}
          <div className="absolute inset-0 rounded-full bg-[#c8a55a]/30 animate-[pulse-ring_2.5s_ease-out_infinite]" />
          <a
            href="/contact"
            className="btn-glow group relative inline-flex items-center gap-3 px-10 py-5 bg-[#c8a55a] text-white font-bold text-lg rounded-full hover:bg-[#b8954a] transition-all duration-300 shadow-2xl hover:shadow-[0_20px_60px_rgba(200,165,90,0.3)] hover:-translate-y-1"
          >
            業務フロー整理 無料相談に申し込む
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="hero-scroll-hint absolute bottom-10 left-1/2 -translate-x-1/2 z-[5] flex flex-col items-center gap-3">
        <span className="text-[10px] text-white/40 tracking-[0.3em] uppercase font-medium">
          Scroll
        </span>
        <div className="w-[1px] h-10 bg-white/10 relative overflow-hidden rounded-full">
          <div
            className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-white/60 to-transparent"
            style={{ animation: "scroll-line 2s ease-in-out infinite" }}
          />
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-[120px] overflow-hidden z-[5]">
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <path
            d="M0,80 C240,120 480,40 720,80 C960,120 1200,40 1440,80 L1440,120 L0,120 Z"
            fill="#f8f7f5"
          />
        </svg>
      </div>
    </section>
  );
}
