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
      "18問の組織行動診断で、意思決定・習慣・コミュニケーション・リーダーシップ・モチベーション・環境設計の6領域を数値化。",
    tag: "診断",
    image: "/images/services/diagnostic.svg",
  },
  {
    icon: Target,
    title: "ナッジ設計\nプログラム",
    description:
      "選択アーキテクチャとデフォルト設計で、社員が「自然に正しい行動を取る」環境を構築。強制ではなく誘導で変える。",
    tag: "設計",
    image: "/images/services/nudge.svg",
  },
  {
    icon: TrendingUp,
    title: "行動KPI\nダッシュボード",
    description:
      "売上の先行指標となる「行動指標」を定義・計測。結果が出る前にプロセスの異常を検知し、軌道修正できる体制へ。",
    tag: "計測",
    image: "/images/services/kpi.svg",
  },
  {
    icon: Users,
    title: "組織行動\nワークショップ",
    description:
      "心理的安全性・認知バイアス・フィードバック設計をテーマに、経営層から現場まで行動科学リテラシーを底上げ。",
    tag: "研修",
    image: "/images/services/workshop.svg",
  },
  {
    icon: Gauge,
    title: "習慣化\nプログラム",
    description:
      "BJ Fogg の Tiny Habits メソッドをベースに、新しい業務プロセスを「やらされ感なく」定着させる90日プログラム。",
    tag: "定着",
    image: "/images/services/habits.svg",
  },
  {
    icon: Settings,
    title: "行動設計 ×\nシステム開発",
    description:
      "診断結果に基づくUI/UX設計、ワークフロー自動化、ダッシュボード開発。行動科学の知見をシステムに実装。",
    tag: "開発",
    image: "/images/services/system.svg",
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

    ScrollTrigger.refresh(true);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
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
            SERVICES
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
