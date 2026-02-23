"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  Brain,
  Target,
  TrendingUp,
  Users,
  Gauge,
  Settings,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ParticleNetwork } from "@/components/ui/particle-network";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    icon: Brain,
    title: "行動診断\nアセスメント",
    description:
      "いわば組織の健康診断。たった18問の質問に答えるだけで「うちの会社、どこがズレてる？」が数字で見えるようになります。",
    tag: "診断",
    image: "/images/services/diagnostic.png",
  },
  {
    icon: Target,
    title: "ナッジ設計\nプログラム",
    description:
      "「自然に動く」仕組みづくり。「やれ」と言わなくても、社員が自然と正しい行動を取る——そんな職場の仕掛けを一緒に設計します。",
    tag: "設計",
    image: "/images/services/nudge.png",
  },
  {
    icon: TrendingUp,
    title: "行動KPI\nダッシュボード",
    description:
      "数字で見える行動の変化。売上が動く前に「社員の行動が変わったか」がわかるから、手遅れになる前に軌道修正できます。",
    tag: "計測",
    image: "/images/services/kpi.png",
  },
  {
    icon: Users,
    title: "組織行動\nワークショップ",
    description:
      "チームで学ぶ行動科学の研修。「なぜ人は動かないのか」を経営層も現場も一緒に学び、共通言語ができるから社内の会話が変わります。",
    tag: "研修",
    image: "/images/services/workshop.png",
  },
  {
    icon: Gauge,
    title: "習慣化\nプログラム",
    description:
      "やり方を定着させる90日間。新しいルールは作って終わりじゃない。「気づいたら当たり前になってた」を目指す、無理のないプログラムです。",
    tag: "定着",
    image: "/images/services/habits.png",
  },
  {
    icon: Settings,
    title: "行動設計 ×\nシステム開発",
    description:
      "仕組みをシステムに落とす。せっかく作ったルールを、ツールやシステムに組み込みます。業務の自動化もまとめて対応。",
    tag: "開発",
    image: "/images/services/system.png",
  },
];

export function BehavioralServices() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bs-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bs-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bs-card",
        { y: 50, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bs-grid",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="services"
      ref={containerRef}
      className="relative overflow-hidden py-24 md:py-32 bg-[#0f1f33]"
    >
      {/* Particle Network Background */}
      <ParticleNetwork
        className="z-[1]"
        lineColor="45, 138, 128"
        nodeColor="rgba(45, 138, 128, 0.3)"
        lineAlpha={0.10}
        maxDistance={140}
        speed={0.3}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f1f33]/30 via-transparent to-[#0f1f33]/50 z-[2]" />

      {/* Gradient blobs */}
      <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
        <div
          className="absolute top-[10%] left-[5%] w-[min(400px,40vw)] h-[min(400px,40vw)] rounded-full bg-[#2d8a80]/10 blur-[100px]"
          style={{ animation: "mesh-drift 18s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[10%] right-[5%] w-[min(350px,35vw)] h-[min(350px,35vw)] rounded-full bg-[#c8a55a]/8 blur-[80px]"
          style={{ animation: "mesh-drift-reverse 22s ease-in-out infinite" }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-[3]">
        <div className="bs-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            サービス一覧
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            6つのサービスライン
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            診断から定着まで。行動科学のフルスタックで組織を変える。
          </p>
        </div>

        <div className="bs-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {services.map((service) => (
            <div
              key={service.title}
              className="bs-card group rounded-3xl bg-white/[0.06] border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.10] hover:border-white/[0.15] hover:-translate-y-1 overflow-hidden"
            >
              {/* Image area */}
              <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-[#2d8a80]/20 via-[#0f1f33]/40 to-[#c8a55a]/10 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title.replace("\n", " ")}
                  fill
                  className="object-cover opacity-0 transition-opacity duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  onLoad={(e) => {
                    (e.target as HTMLImageElement).classList.remove("opacity-0");
                  }}
                />
                {/* Fallback gradient overlay with icon watermark */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <service.icon className="w-12 h-12 text-white/10" />
                </div>
                {/* Tag badge over image */}
                <span className="absolute top-3 right-3 text-xs font-bold tracking-widest text-[#c8a55a]/90 bg-[#0f1f33]/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/[0.08]">
                  {service.tag}
                </span>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2d8a80]/15 flex items-center justify-center transition-all duration-300 group-hover:bg-[#2d8a80]/25 group-hover:shadow-[0_0_20px_rgba(45,138,128,0.2)]">
                    <service.icon className="w-5 h-5 text-[#2d8a80]" />
                  </div>
                  <h3 className="text-lg font-bold text-white whitespace-pre-line leading-snug">
                    {service.title}
                  </h3>
                </div>
                <p className="text-sm text-white/55 leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
