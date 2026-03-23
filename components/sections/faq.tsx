"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    question: "「社長の右腕」って、人を派遣してくれるのですか？",
    answer:
      "いいえ。私たちがつくるのは「人」ではなく「仕組み」です。業務フローを整理し、社長が指示をしなくても同じ結果が出る体制の実現を目指します。",
  },
  {
    question: "業務の整理って、具体的に何をしてくれるんですか？",
    answer:
      "まず「誰が・何を・どの順番で」やっているかを可視化します。そのうえで、人がやるべきこと・仕組みに任せるべきことを仕分けし、必要に応じてシステム化やAI活用の設計まで行います。",
  },
  {
    question: "相談したら必ず契約しないといけませんか？",
    answer:
      "いいえ。無料相談は「現状の整理」が目的です。相談した結果、自社で対応できそうだと思えばそれで大丈夫です。押し売りは一切しません。",
  },
  {
    question: "社員が少ないのですが、仕組み化できますか？",
    answer:
      "業務内容にもよりますが、少人数の会社でも仕組み化できた事例は多くあります。実際に在宅スタッフだけで回る体制を構築したケースも。まずは現状を聞かせていただければ、可能かどうかを一緒に判断できます。",
  },
  {
    question: "自分がいなくても本当に回るようになりますか？",
    answer:
      "業務内容によりますが、実際に「残業ゼロ」「社長不在でも運営可能」を実現した事例があります。一気に手を離すのではなく、段階的に仕組みを整えて、少しずつ社長の手が空いていく形で進めます。",
  },
  {
    question: "どのくらいの期間で変化が出ますか？",
    answer:
      "企業の状況により異なりますが、業務フローの整理だけでも数週間で効果が見え始めます。大規模なシステム導入ではなく「今ある業務の流れを最適化する」ことが中心なので、比較的早く成果が出ます。",
  },
  {
    question: "費用はどのくらいかかりますか？",
    answer:
      "一般的なコンサルティングは月額30〜50万円が相場ですが、AIホットラインは業務整理に特化しているため月額5万円〜からご相談いただけます。企業の状況や課題に応じて柔軟に対応しますので、まずはお気軽に無料相談でお聞かせください。",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        gsap.to(contentRef.current, {
          height: "auto",
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
        });
      } else {
        gsap.to(contentRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    }
  }, [isOpen]);

  return (
    <div
      className={`border-b border-slate-200/60 last:border-b-0 rounded-xl px-2 transition-all duration-500 ${
        isOpen
          ? "shadow-[0_0_20px_rgba(45,138,128,0.08)] bg-[#2d8a80]/[0.02]"
          : ""
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <div className="flex items-center gap-3 pr-4">
          <div
            className={`w-[3px] h-5 rounded-full transition-all duration-300 ${
              isOpen ? "bg-[#2d8a80]" : "bg-transparent group-hover:bg-[#2d8a80]/30"
            }`}
          />
          <span
            className={`text-base font-semibold transition-colors duration-300 ${
              isOpen
                ? "text-[#2d8a80]"
                : "text-slate-800 group-hover:text-[#2d8a80]"
            }`}
          >
            {question}
          </span>
        </div>
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
            isOpen
              ? "bg-[#2d8a80]/10 rotate-180"
              : "bg-slate-100 group-hover:bg-[#2d8a80]/10"
          }`}
        >
          <ChevronDown
            className={`w-4 h-4 transition-colors duration-300 ${
              isOpen ? "text-[#2d8a80]" : "text-slate-400"
            }`}
          />
        </div>
      </button>
      <div ref={contentRef} className="overflow-hidden h-0 opacity-0">
        <p className="text-sm text-slate-500 leading-relaxed pb-5 pl-[27px]">
          {answer}
        </p>
      </div>
    </div>
  );
}

export function Faq() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".faq-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".faq-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".faq-list",
        { y: 40, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          delay: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".faq-list",
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
      className="relative py-24 md:py-32 bg-[#f8f7f5] overflow-hidden"
    >
      {/* Grid pattern background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Ccircle cx='20' cy='20' r='1' fill='%230f1f33' opacity='0.03'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top glow separator */}
      <div className="section-glow-top" />

      {/* Floating decorative hexagon */}
      <div
        className="absolute top-16 right-[8%] w-[60px] h-[60px] pointer-events-none hidden md:block"
        style={{ animation: "float 8s ease-in-out infinite" }}
      >
        <svg viewBox="0 0 60 60" fill="none" className="w-full h-full opacity-[0.05]">
          <polygon
            points="30,2 54,16 54,44 30,58 6,44 6,16"
            stroke="#2d8a80"
            strokeWidth="1.5"
            fill="none"
          />
          <polygon
            points="30,10 46,20 46,40 30,50 14,40 14,20"
            stroke="#2d8a80"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
      </div>

      {/* Floating dashed circle */}
      <div
        className="absolute top-[40%] left-[5%] w-[80px] h-[80px] pointer-events-none hidden md:block"
        style={{ animation: "mesh-drift 12s ease-in-out infinite" }}
      >
        <svg viewBox="0 0 80 80" fill="none" className="w-full h-full opacity-[0.04]">
          <circle
            cx="40"
            cy="40"
            r="34"
            stroke="#c8a55a"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
          <circle
            cx="40"
            cy="40"
            r="22"
            stroke="#2d8a80"
            strokeWidth="0.8"
            strokeDasharray="3 5"
          />
        </svg>
      </div>

      {/* Floating diamond cluster */}
      <div
        className="absolute bottom-[15%] right-[4%] w-[50px] h-[50px] pointer-events-none hidden md:block"
        style={{ animation: "mesh-drift-reverse 10s ease-in-out infinite" }}
      >
        <svg viewBox="0 0 50 50" fill="none" className="w-full h-full opacity-[0.05]">
          <rect
            x="17"
            y="17"
            width="16"
            height="16"
            rx="1"
            stroke="#2d8a80"
            strokeWidth="1"
            transform="rotate(45 25 25)"
          />
          <rect
            x="20"
            y="20"
            width="10"
            height="10"
            rx="0.5"
            stroke="#c8a55a"
            strokeWidth="0.8"
            transform="rotate(45 25 25)"
          />
        </svg>
      </div>

      {/* Decorative ring */}
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] pointer-events-none hidden md:block">
        <svg
          viewBox="0 0 400 400"
          fill="none"
          className="w-full h-full opacity-[0.04]"
          style={{ animation: "spin-slow 80s linear infinite" }}
        >
          <circle cx="200" cy="200" r="180" stroke="#2d8a80" strokeWidth="1" />
          <circle cx="200" cy="200" r="150" stroke="#c8a55a" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="faq-header text-center mb-12">
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-slate-800 mb-4">
            よくあるご質問
          </h2>
        </div>

        <div className="faq-list border-gradient-animated bg-white rounded-3xl p-6 sm:p-8 shadow-sm">
          {faqs.map((faq) => (
            <FaqItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
