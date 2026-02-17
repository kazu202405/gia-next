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
      "売上3,000万〜10億規模の中小企業を中心にサポートしています。業種は問いません。飲食、建設、コンサル、商社など、幅広い業界の実績があります。",
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
    <div className="border-b border-slate-200/60 last:border-b-0">
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
      {/* Top glow separator */}
      <div className="section-glow-top" />

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
