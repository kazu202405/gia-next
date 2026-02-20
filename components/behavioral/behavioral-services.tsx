"use client";

import { useEffect, useRef } from "react";
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

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    icon: Brain,
    title: "行動診断\nアセスメント",
    description:
      "18問の組織行動診断で、意思決定・習慣・コミュニケーション・リーダーシップ・モチベーション・環境設計の6領域を数値化。",
    tag: "診断",
  },
  {
    icon: Target,
    title: "ナッジ設計\nコンサルティング",
    description:
      "選択アーキテクチャとデフォルト設計で、社員が「自然に正しい行動を取る」環境を構築。強制ではなく誘導で変える。",
    tag: "設計",
  },
  {
    icon: TrendingUp,
    title: "行動KPI\nダッシュボード",
    description:
      "売上の先行指標となる「行動指標」を定義・計測。結果が出る前にプロセスの異常を検知し、軌道修正できる体制へ。",
    tag: "計測",
  },
  {
    icon: Users,
    title: "組織行動\nワークショップ",
    description:
      "心理的安全性・認知バイアス・フィードバック設計をテーマに、経営層から現場まで行動科学リテラシーを底上げ。",
    tag: "研修",
  },
  {
    icon: Gauge,
    title: "習慣化\nプログラム",
    description:
      "BJ Fogg の Tiny Habits メソッドをベースに、新しい業務プロセスを「やらされ感なく」定着させる90日プログラム。",
    tag: "定着",
  },
  {
    icon: Settings,
    title: "行動設計 ×\nシステム開発",
    description:
      "診断結果に基づくUI/UX設計、ワークフロー自動化、ダッシュボード開発。行動科学の知見をシステムに実装。",
    tag: "開発",
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
      ref={containerRef}
      className="relative overflow-hidden py-24 md:py-32 bg-[#0f1f33]"
    >
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Gradient blobs */}
      <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-[#2d8a80]/8 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] rounded-full bg-[#c8a55a]/5 blur-[80px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
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
              className="bs-card group p-8 rounded-3xl bg-white/[0.05] backdrop-blur-sm border border-white/[0.08] transition-all duration-300 hover:bg-white/[0.08] hover:border-white/[0.15] hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#2d8a80]/15 flex items-center justify-center transition-all duration-300 group-hover:bg-[#2d8a80]/25 group-hover:shadow-[0_0_20px_rgba(45,138,128,0.2)]">
                  <service.icon className="w-7 h-7 text-[#2d8a80]" />
                </div>
                <span className="text-xs font-bold tracking-widest text-[#c8a55a]/80 bg-[#c8a55a]/10 px-3 py-1 rounded-full">
                  {service.tag}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-3 whitespace-pre-line leading-snug">
                {service.title}
              </h3>
              <p className="text-sm text-white/55 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
