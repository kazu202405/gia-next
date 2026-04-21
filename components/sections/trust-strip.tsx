"use client";

import { useEffect, useRef } from "react";
import {
  TrendingUp,
  Building2,
  Briefcase,
  Coins,
  ShieldCheck,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// 仮の信頼要素（既存の実績・FAQから抽出）
// 事実ベースで微調整予定
const items = [
  { icon: TrendingUp, label: "外注費→0、残業→0の実績" },
  { icon: Building2, label: "大阪メトロ・自衛隊関連領域に対応" },
  { icon: Briefcase, label: "6業種の仕組み化実績" },
  { icon: Coins, label: "月額5万円〜から" },
  { icon: ShieldCheck, label: "相談無料・押し売りなし" },
];

export function TrustStrip() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".ts-item",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".ts-container",
            start: "top 95%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative bg-[#0f1f33] py-7 md:py-9 overflow-hidden border-t border-b border-white/[0.06]"
    >
      <div className="ts-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4 md:gap-x-10">
          {items.map((item) => (
            <div
              key={item.label}
              className="ts-item flex items-center gap-2.5"
            >
              <div className="w-7 h-7 rounded-lg bg-[#2d8a80]/15 flex items-center justify-center flex-shrink-0">
                <item.icon className="w-3.5 h-3.5 text-[#2d8a80]" />
              </div>
              <span className="text-xs md:text-sm text-white/70 font-medium whitespace-nowrap">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
