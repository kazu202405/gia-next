"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  UserX,
  TrendingDown,
  ListChecks,
  Repeat,
  GitBranch,
  Users,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ParticleNetwork } from "@/components/ui/particle-network";

gsap.registerPlugin(ScrollTrigger);

const symptoms = [
  {
    icon: UserX,
    title: "社長がいないと、現場が止まる",
    description:
      "判断も、確認も、すべてあなたに集中していませんか？ちょっと抜けただけで電話が鳴り止まない——その状態、限界がきています。",
  },
  {
    icon: TrendingDown,
    title: "忙しいのに成果が見えず、すべてが感覚頼み",
    description:
      "朝から晩まで動いているのに利益が残らない。数字も役割も曖昧で、判断はいつも「なんとなく」。いつか大きなミスが起きそうな予感がある。",
  },
  {
    icon: ListChecks,
    title: "やるべきことが多すぎて、動けない",
    description:
      "採用、DX、営業改善……課題は見えている。でも何から手をつけていいかわからず、結局また今日も目の前の作業に追われる。",
  },
];

const causes = [
  {
    icon: Repeat,
    title: "業務フローが属人化している",
    description:
      "「あの人に聞かないとわからない」が常態化。人が変わるたびに業務が止まり、引き継ぎのたびにゼロからやり直しになる。",
  },
  {
    icon: GitBranch,
    title: "判断基準がバラバラ",
    description:
      "同じ状況でも人によって対応が違う。ルールがないから「なんとなく」で動き、ミスが起きても原因がわからない。",
  },
  {
    icon: Users,
    title: "仕組みではなく「人」に依存している",
    description:
      "優秀な人が抜けたら終わり。採用しても育たない。それは人の問題ではなく、仕組みがないことの問題です。",
  },
];

function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;

    gsap.to(card, {
      rotateX,
      rotateY,
      duration: 0.4,
      ease: "power2.out",
      transformPerspective: 800,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.6,
      ease: "power2.out",
    });
  }, []);

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}

export function Challenges() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header
      gsap.fromTo(
        ".ch-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".ch-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Symptom cards
      gsap.fromTo(
        ".ch-symptom-card",
        { y: 50, opacity: 0, rotateX: 8 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".ch-symptoms",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Flow transition label
      gsap.fromTo(
        ".ch-flow-arrow",
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".ch-flow-arrow",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Sub-header
      gsap.fromTo(
        ".ch-subheader",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".ch-subheader",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Cause cards
      gsap.fromTo(
        ".ch-cause-card",
        { y: 40, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.14,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".ch-causes",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);

    ScrollTrigger.refresh(true);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden py-24 md:py-32 bg-[#0f1f33]"
    >
      {/* Particle Network Background */}
      <ParticleNetwork
        className="z-[1]"
        lineColor="45, 138, 128"
        nodeColor="rgba(45, 138, 128, 0.35)"
        lineAlpha={0.12}
        maxDistance={160}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1f33]/40 via-transparent to-[#0f1f33]/60 z-[2]" />

      {/* Floating blobs */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        <div
          className="absolute top-[10%] left-[10%] w-[min(400px,40vw)] h-[min(400px,40vw)] rounded-full bg-[#2d8a80]/10 blur-[100px]"
          style={{ animation: "mesh-drift 18s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[15%] right-[10%] w-[min(350px,35vw)] h-[min(350px,35vw)] rounded-full bg-[#c8a55a]/8 blur-[80px]"
          style={{ animation: "mesh-drift-reverse 20s ease-in-out infinite" }}
        />
      </div>

      <div className="relative z-[3] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="ch-header text-center mb-16">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            こんな状態に、心当たりはありませんか？
          </h2>
          <p className="text-lg text-white/60">
            ひとつでも当てはまるなら、それは「仕組み」の問題かもしれません。
          </p>
        </div>

        {/* Symptom Cards (Top 3) */}
        <div
          className="ch-symptoms grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          style={{ perspective: "800px" }}
        >
          {symptoms.map((item) => (
            <TiltCard
              key={item.title}
              className="ch-symptom-card group"
            >
              <div className="relative p-6 rounded-3xl bg-white/[0.06] backdrop-blur-md border border-white/[0.1] transition-all duration-400 hover:bg-white/[0.1] hover:border-white/[0.18] hover:shadow-[0_8px_32px_rgba(45,138,128,0.15)]">
                {/* Inner glow on hover */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-[#2d8a80]/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden="true"
                />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#2d8a80]/15 flex items-center justify-center mb-4 transition-transform duration-400 group-hover:scale-110">
                    <item.icon className="w-6 h-6 text-[#2d8a80]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>

        {/* Flow Transition: animated scroll-down indicator */}
        <div className="ch-flow-arrow flex flex-col items-center my-16 gap-3">
          <div className="w-[1px] h-14 bg-white/[0.08] relative overflow-hidden rounded-full">
            <div
              className="absolute top-0 left-0 w-full h-5 bg-gradient-to-b from-[#2d8a80]/80 to-transparent"
              style={{ animation: "scroll-line 2s ease-in-out infinite" }}
            />
          </div>
        </div>

        {/* Sub-header for causes */}
        <div className="ch-subheader text-center mb-10">
          <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl sm:text-3xl font-semibold text-white/90 mb-3">
            なぜ、変われないのか？
          </h3>
          <p className="text-base text-white/50 max-w-2xl mx-auto leading-relaxed">
            課題が見えているのに変われない。その原因は、個人の力不足ではなく
            <br className="hidden sm:block" />
            「業務フローの設計」が抜けていることにあります。
          </p>
        </div>

        {/* Cause Cards (Bottom 3) */}
        <div
          className="ch-causes grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
          style={{ perspective: "800px" }}
        >
          {causes.map((item) => (
            <TiltCard
              key={item.title}
              className="ch-cause-card group"
            >
              <div className="relative p-8 rounded-3xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] text-center transition-all duration-400 hover:bg-white/[0.08] hover:border-white/[0.15] hover:shadow-[0_8px_32px_rgba(200,165,90,0.1)]">
                {/* Inner glow on hover */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-[#c8a55a]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  aria-hidden="true"
                />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#c8a55a]/10 flex items-center justify-center mx-auto mb-5 transition-transform duration-400 group-hover:scale-110">
                    <item.icon className="w-7 h-7 text-[#c8a55a]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-white/45 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </div>

      {/* Wave Divider at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[80px] overflow-hidden z-[4]">
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <path
            d="M0,50 C360,80 720,20 1080,50 C1260,65 1380,45 1440,50 L1440,80 L0,80 Z"
            fill="#f8f7f5"
          />
        </svg>
      </div>
    </section>
  );
}
