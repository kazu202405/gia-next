"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const faqs = [
  {
    question: "どんな業種・規模に対応していますか？",
    answer:
      "業務フローが整っていない企業であれば、規模を問わずサポートできます。業種も問いません。飲食、建設、コンサル、商社など、幅広い業界の実績があります。",
  },
  {
    question: "どのくらいの期間で変化が出ますか？",
    answer:
      "企業の状況により異なりますが、多くの場合3ヶ月程度で現場が自走できる基盤を構築できます。業務フローの整理は大規模なシステム導入ではなく「今ある業務の流れを最適化する」ことが中心なので、比較的早く成果が見え始めます。",
  },
  {
    question:
      "コンサルに丸投げするのではなく、自社でも動く必要がありますか？",
    answer:
      "はい、経営者と現場チームの関与が不可欠です。ただし、GIAが伴走しながら進めるので「何をすればいいかわからない」という状態にはなりません。週1回のミーティングと、日常業務の中で少しずつ仕組みを導入していきます。",
  },
  {
    question: "他のコンサルとの違いは何ですか？",
    answer:
      "GIAは「設計して終わり」ではなく「定着するまで」を設計します。業務フロー整理に加え、行動心理学に基づいた定着設計を組み込むことで、導入した仕組みが自然に根付きます。また、DX・システム開発も社内対応できるため、外注不要で一気通貫です。",
  },
  {
    question: "無料相談では何がわかりますか？",
    answer:
      "御社の業務フローのボトルネックを可視化します。「何が問題で、何から手をつけるべきか」が明確になります。営業は一切ありません。",
  },
  {
    question: "費用はどのくらいかかりますか？",
    answer:
      "サービスの内容は企業ごとにカスタマイズするため、まずは無料相談で現状をお聞かせください。その上で、最適なプランと費用をご提案します。",
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
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <div className="flex items-center gap-3 pr-4">
          {/* Teal indicator */}
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
