"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  ClipboardList,
  Brain,
  BarChart3,
  Users,
  Repeat,
  Settings,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ParticleNetwork } from "@/components/ui/particle-network";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    icon: ClipboardList,
    title: "業務フロー\n診断",
    description:
      "今の業務がどう流れているかを可視化します。「誰が何をしているか」が見えるようになるだけで、改善すべきポイントが明確になります。",
    tag: "可視化",
    image: "/images/services/diagnostic.png",
  },
  {
    icon: Brain,
    title: "AI活用\n設計",
    description:
      "整理された業務フローをもとに、AIが効果を発揮できるポイントを特定。「とりあえずAI」ではなく、本当に意味のある活用法を設計します。",
    tag: "AI設計",
    image: "/images/services/nudge.png",
  },
  {
    icon: BarChart3,
    title: "業務改善\nダッシュボード",
    description:
      "業務改善の進捗を数字で追えるようにします。感覚ではなくデータで判断できるから、次のアクションが明確になります。",
    tag: "計測",
    image: "/images/services/kpi.png",
  },
  {
    icon: Users,
    title: "DX設計\nワークショップ",
    description:
      "経営層と現場が一緒にDXの方向性を考える場を設計。共通認識ができるから、導入後の混乱がなくなります。",
    tag: "共有",
    image: "/images/services/workshop.png",
  },
  {
    icon: Repeat,
    title: "業務定着\nプログラム",
    description:
      "新しい仕組みは作って終わりではありません。「気づいたら当たり前になっていた」を目指す、無理のない定着支援です。",
    tag: "定着",
    image: "/images/services/habits.png",
  },
  {
    icon: Settings,
    title: "システム\n開発",
    description:
      "業務整理の結果、システム化すべきものは社内で開発。自動化やツール連携もまとめて対応できます。",
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
            対応できること
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            整理から仕組み化まで、
            <br className="hidden sm:block" />
            ぜんぶ一気通貫
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            「相談したら、選ばれる理由が見えるところまでやってくれた」を目指しています。
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <service.icon className="w-12 h-12 text-white/10" />
                </div>
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
