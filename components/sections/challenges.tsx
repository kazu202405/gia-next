"use client";

import { useEffect, useRef } from "react";
import {
  HelpCircle,
  MessageSquare,
  PackageX,
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
    icon: HelpCircle,
    title: "本来やるべきことに手が回らない",
    description:
      "判断も指示も全部自分。日々の業務に追われて、本当に考えるべきこと——事業の方向性や価値づくりに集中できていない。",
  },
  {
    icon: MessageSquare,
    title: "誰が何をやっているか把握しきれない",
    description:
      "業務の全体像が見えない。誰がどの仕事を抱えていて、どこで詰まっているのか。人の力が活きているのかもわからない。",
  },
  {
    icon: PackageX,
    title: "人が変わるたびにゼロに戻る",
    description:
      "ノウハウが人の頭の中にしかない。人が変わるたびにやり直し。属人的なままでは、人の価値も積み上がらない。",
  },
];

const causes = [
  {
    icon: Repeat,
    number: "01",
    title: "業務の全体像、見えなくなっていませんか？",
    description:
      "忙しい日々の中で、誰が何をどの順番でやっているか、把握しきれなくなるのは自然なこと。見えないと、人の力をどこに活かすべきかもわかりません。",
  },
  {
    icon: GitBranch,
    number: "02",
    title: "「任せたいけど任せられない」状態になっていませんか？",
    description:
      "任せたい気持ちはある。でも何を任せていいのか、どう切り出せばいいのかがわからない。人の力が活きる場所が見えていないだけかもしれません。",
  },
  {
    icon: Users,
    number: "03",
    title: "一人ひとりの強みが活かしきれていませんか？",
    description:
      "スタッフが悪いわけではありません。判断の基準や業務の流れが共有されていないだけ。仕組みがあれば、人は自分の強みを発揮できます。",
  },
];

export function Challenges() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
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

      // 症状ローをスライドイン
      gsap.fromTo(
        ".ch-symptom-row",
        { x: -40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".ch-symptoms",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

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

      // 原因ローをスライドイン
      gsap.fromTo(
        ".ch-cause-row",
        { x: -40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
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

    return () => ctx.revert();
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

      <div className="relative z-[3] max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="ch-header text-center mb-16">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            紹介も営業も、
            <br className="hidden sm:block" />
            属人化していませんか？
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            業務に追われるほど、紹介や売上も「人頼り」になっていく。選ばれる理由は、仕組みの中から生まれます。
          </p>
        </div>

        {/* Symptom Rows — エディトリアルレイアウト */}
        <div className="ch-symptoms max-w-3xl mx-auto mb-8">
          {symptoms.map((item, i) => (
            <div
              key={item.title}
              className={`ch-symptom-row group flex items-start gap-5 py-5 pl-4 border-l-2 border-[#2d8a80]/20 transition-all duration-300 hover:border-[#2d8a80] hover:translate-x-1 hover:bg-white/[0.02] rounded-r-lg ${
                i < symptoms.length - 1 ? "mb-2" : ""
              }`}
            >
              {/* アイコン */}
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#2d8a80]/15 flex items-center justify-center transition-all duration-300 group-hover:bg-[#2d8a80]/25 group-hover:scale-110">
                <item.icon className="w-5 h-5 text-[#2d8a80]" />
              </div>

              {/* テキスト */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white mb-1 transition-colors duration-300 group-hover:text-[#4ecdc4]">
                  {item.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Flow Transition */}
        <div className="ch-flow-arrow flex flex-col items-center my-8 gap-3">
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
            なぜ、紹介や売上が仕組みにならないのか？
          </h3>
          <p className="text-base text-white/50 max-w-2xl mx-auto leading-relaxed">
            頑張りが足りないわけではありません。
            <br className="hidden sm:block" />
            属人的な業務が仕組みになっていないだけかもしれません。
          </p>
        </div>

        {/* Cause Rows — ナンバー付きエディトリアル */}
        <div className="ch-causes max-w-3xl mx-auto">
          {causes.map((item, i) => (
            <div
              key={item.title}
              className={`ch-cause-row group flex items-start gap-5 py-7 transition-all duration-300 hover:translate-x-2 ${
                i < causes.length - 1 ? "border-b border-white/[0.06]" : ""
              }`}
            >
              {/* 大きな番号 */}
              <div className="flex-shrink-0 w-14 flex flex-col items-center">
                <span className="text-3xl font-bold text-[#c8a55a]/25 font-[family-name:var(--font-noto-serif-jp)]">
                  {item.number}
                </span>
              </div>

              {/* テキスト */}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-2 transition-colors duration-300 group-hover:text-[#c8a55a]">
                  {item.title}
                </h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 損失回避メッセージ */}
        <div className="text-center mt-16">
          <p className="text-sm text-white/40 leading-relaxed max-w-lg mx-auto">
            業務が整理されないまま時間が過ぎると、属人化はさらに進み、
            <br className="hidden sm:block" />
            紹介も売上も「人頼り」のまま固定化されていきます。
          </p>
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
