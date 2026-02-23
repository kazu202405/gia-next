"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const works = [
  {
    title: "紙業務を脱却し、査定とマッチングを瞬時にできるように",
    industry: "飲食店専門の不動産会社",
    summary:
      "紙ベースの査定・見積りをシステム化し、作業時間を大幅に短縮。顧客情報の一元管理で育成フローを構築し、KPIの管理まで一気通貫。",
    outcomes: ["瞬時に査定", "顧客一元管理", "新規事業創出"],
    tags: ["業務フロー整理", "DX", "業務自動化"],
    image: "/images/works/work1.jpg",
  },
  {
    title: "分散していたデータを統合し、営業判断をリアルタイムに可視化",
    industry: "省エネコンサルティング会社",
    summary:
      "バラバラだった顧客・営業データを統合。ダッシュボードで経営数字が即座に見える状態をつくり、属人的だった営業育成を仕組み化。",
    outcomes: ["データ一元化", "判断スピード向上", "育成の仕組み化"],
    tags: ["業務フロー整理", "見える化", "営業管理"],
    image: "/images/works/work2.jpg",
  },
  {
    title: "AI導入で定型業務を効率化し、ブランド発信を強化",
    industry: "美容用品商社",
    summary:
      "社内の定型業務にAIを導入して工数を削減。空いたリソースでブランド価値を伝えるHP制作も実現し、運用しやすい体制へ。",
    outcomes: ["業務工数削減", "HP刷新", "運用体制確立"],
    tags: ["AI活用", "業務フロー整理", "ブランディング"],
    image: "/images/works/work3.jpg",
  },
  {
    title: "申請業務を一元化し、計画書作成をAIで半自動化",
    industry: "補助金申請会社",
    summary:
      "スプレッドシート運用を脱却し、申請情報を一元管理。AIによる事業計画書の下書き自動生成で、日常業務の効率化を実現。",
    outcomes: ["情報一元化", "計画書半自動化", "業務効率化"],
    tags: ["AI活用", "業務フロー整理", "申請業務"],
    image: "/images/works/work4.jpg",
  },
  {
    title: "業務を見える化し、社長不在でも回る体制を構築",
    industry: "高圧電気工事会社（大阪メトロ等）",
    summary:
      "煩雑だった事務作業を整理し、経営数字の見える化と役割設計を実施。「仕組み化」を中心に伴走し、自走できる運営体制を構築。",
    outcomes: ["経営の見える化", "役割設計", "自走体制構築"],
    tags: ["業務フロー整理", "仕組み化", "伴走支援"],
    image: "/images/works/work5.jpg",
  },
  {
    title: "DX基盤を構築し、在宅スタッフのみで回る仕組みを構築",
    industry: "公共工事会社（自衛隊関連等）",
    summary:
      "公共工事を扱う会社のDX基盤を構築。性格と能力に合わせた人材の配置と、AIの導入により経営者が業務フローに入らなくてもよい仕組みを作った。",
    outcomes: ["DX基盤構築", "アライアンス成立", "事業拡大準備"],
    tags: ["DX基盤", "業務フロー整理", "アライアンス"],
    image: "/images/works/work6.jpg",
  },
];

// Desktop: 3枚ずつに分割
const worksSets = [works.slice(0, 3), works.slice(3, 6)];

function WorkCard({ work }: { work: (typeof works)[0] }) {
  return (
    <Card className="card-glow overflow-hidden transition-all duration-300 shadow-lg hover:-translate-y-2 hover:shadow-2xl group rounded-3xl">
      <div className="relative h-[180px] overflow-hidden">
        <Image
          src={work.image}
          alt={work.title}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/20 to-transparent pointer-events-none" />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
          {work.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="bg-white/95 text-slate-700 text-xs border border-white/40 backdrop-blur-sm"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-[#2d8a80] mb-1">
          {work.industry}
        </p>
        <h4 className="text-base font-bold text-slate-800 mb-2 leading-snug">
          {work.title}
        </h4>
        <p className="text-sm text-slate-500 leading-relaxed mb-3">
          {work.summary}
        </p>
        <div className="flex flex-wrap gap-1">
          {work.outcomes.map((outcome) => (
            <Badge
              key={outcome}
              variant="outline"
              className="text-xs bg-[#2d8a80]/10 text-[#2d8a80] border-[#2d8a80]/30"
            >
              {outcome}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WorksStack() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".works-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".works-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Mobile/Tablet: simple stagger fade-in
      gsap.fromTo(
        ".works-mobile-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".works-mobile-grid",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      // Desktop: card stack animation
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      if (isDesktop) {
        document.querySelectorAll(".card-stack").forEach((stack) => {
          const cards = stack.querySelectorAll(".stack-card");

          gsap.fromTo(
            cards,
            {
              y: (i: number) => i * 8,
              x: (i: number) => i * 8 - 340,
              rotation: (i: number) => i * 2,
              opacity: 0,
            },
            {
              y: 0,
              x: (i: number) => (i - 1) * 360,
              rotation: 0,
              opacity: 1,
              duration: 0.7,
              stagger: 0.12,
              ease: "power2.out",
              scrollTrigger: {
                trigger: stack,
                start: "top 95%",
                toggleActions: "play none none none",
              },
            }
          );
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="results"
      className="py-24 md:py-32 bg-[#f8f7f5] relative overflow-hidden"
    >
      {/* Section glow top divider */}
      <div className="section-glow-top" />

      {/* Floating decorative elements */}
      <div
        className="absolute top-[15%] left-[-6%] w-[320px] h-[320px] rounded-full opacity-[0.07] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, #2d8a80 0%, transparent 70%)",
          animation: "mesh-drift 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[20%] right-[-4%] w-[260px] h-[260px] rounded-full opacity-[0.05] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, #2d8a80 0%, transparent 70%)",
          animation: "mesh-drift-reverse 22s ease-in-out infinite",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="works-header text-center mb-16">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-6">
            実際に起きた変化
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            業務フロー整理を通じて、実際にどんな変化が生まれたか。クライアントの事例をご紹介します。
          </p>
        </div>

        {/* Mobile/Tablet: Grid layout */}
        <div className="works-mobile-grid grid grid-cols-1 sm:grid-cols-2 gap-6 lg:hidden">
          {works.map((work, index) => (
            <div key={index} className="works-mobile-card">
              <WorkCard work={work} />
            </div>
          ))}
        </div>

        {/* Desktop: Card Stack layout */}
        <div className="hidden lg:block space-y-16">
          {worksSets.map((set, setIndex) => (
            <div
              key={setIndex}
              className="card-stack relative h-[520px] flex justify-center"
            >
              {set.map((work, index) => (
                <Card
                  key={index}
                  className="stack-card absolute w-[340px] overflow-hidden transition-all duration-300 shadow-lg hover:-translate-y-4 hover:shadow-[0_20px_50px_-12px_rgba(45,138,128,0.18),0_8px_24px_-8px_rgba(0,0,0,0.12)] hover:z-50 group rounded-3xl"
                  style={{
                    zIndex: 3 - index,
                  }}
                >
                  <div className="relative h-[180px] overflow-hidden">
                    <Image
                      src={work.image}
                      alt={work.title}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/20 to-transparent pointer-events-none" />
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                      {work.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-white/95 text-slate-700 text-xs border border-white/40 backdrop-blur-sm"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <p className="text-sm font-semibold text-[#2d8a80] mb-1">
                      {work.industry}
                    </p>
                    <h4 className="text-base font-bold text-slate-800 mb-2 leading-snug">
                      {work.title}
                    </h4>
                    <p className="text-sm text-slate-500 leading-relaxed mb-3">
                      {work.summary}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {work.outcomes.map((outcome) => (
                        <Badge
                          key={outcome}
                          variant="outline"
                          className="text-xs bg-[#2d8a80]/10 text-[#2d8a80] border-[#2d8a80]/30"
                        >
                          {outcome}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Wave Divider - commented out */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-[120px] overflow-hidden z-[1]">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,40 Q360,100 720,40 T1440,40 L1440,120 L0,120 Z" fill="#0f1f33" />
        </svg>
      </div>

      <div className="h-[140px] lg:block hidden" /> */}
    </section>
  );
}
