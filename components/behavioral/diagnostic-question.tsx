"use client";

import { useEffect, useRef, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import gsap from "gsap";

export interface Question {
  id: number;
  domain: string;
  domainIndex: number;
  text: string;
}

interface DiagnosticQuestionProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  currentAnswer: number | undefined;
  onAnswer: (questionId: number, score: number) => void;
  onBack: () => void;
  canGoBack: boolean;
}

const scaleLabels = [
  { value: 1, label: "全く\n当てはまらない" },
  { value: 2, label: "あまり\n当てはまらない" },
  { value: 3, label: "どちらとも\nいえない" },
  { value: 4, label: "やや\n当てはまる" },
  { value: 5, label: "非常に\n当てはまる" },
];

export function DiagnosticQuestion({
  question,
  currentIndex,
  totalQuestions,
  currentAnswer,
  onAnswer,
  onBack,
  canGoBack,
}: DiagnosticQuestionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevIndexRef = useRef(currentIndex);

  const animateIn = useCallback(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".dq-question-text",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
      );
      gsap.fromTo(
        ".dq-scale-btn",
        { y: 15, opacity: 0, scale: 0.9 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          stagger: 0.06,
          ease: "power2.out",
          delay: 0.15,
        }
      );
    }, containerRef);
    return ctx;
  }, []);

  useEffect(() => {
    const ctx = animateIn();
    prevIndexRef.current = currentIndex;
    return () => ctx?.revert();
  }, [currentIndex, animateIn]);

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  // Detect domain change
  const domainNames = [
    "意思決定",
    "習慣設計",
    "コミュニケーション",
    "リーダーシップ",
    "モチベーション",
    "環境設計",
  ];

  return (
    <div ref={containerRef} className="relative min-h-screen flex flex-col">
      {/* Top bar - offset for fixed header */}
      <div className="sticky top-[64px] z-40 bg-[#0f1f33]/95 backdrop-blur-md border-b border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40 font-medium">
              {currentIndex + 1} / {totalQuestions}
            </span>
            <span className="text-xs text-[#2d8a80] font-semibold">
              {question.domain}
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2d8a80] to-[#3a9e93] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Domain indicator pills */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2 w-full">
        <div className="flex gap-1.5 justify-center flex-wrap">
          {domainNames.map((name, i) => (
            <span
              key={name}
              className={`text-[10px] px-2.5 py-1 rounded-full transition-all duration-300 ${
                i === question.domainIndex
                  ? "bg-[#2d8a80]/20 text-[#2d8a80] font-semibold"
                  : i < question.domainIndex
                    ? "bg-white/[0.04] text-white/30"
                    : "bg-white/[0.02] text-white/15"
              }`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Question content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-xl w-full">
          <p className="dq-question-text font-[family-name:var(--font-noto-serif-jp)] text-xl sm:text-2xl md:text-3xl font-medium text-white leading-relaxed text-center mb-12">
            {question.text}
          </p>

          {/* 5-scale buttons */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3 mb-8">
            {scaleLabels.map((s) => (
              <button
                key={s.value}
                onClick={() => onAnswer(question.id, s.value)}
                className={`dq-scale-btn group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border transition-all duration-300 ${
                  currentAnswer === s.value
                    ? "bg-[#2d8a80]/20 border-[#2d8a80] shadow-[0_0_20px_rgba(45,138,128,0.2)]"
                    : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15]"
                }`}
              >
                <span
                  className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${
                    currentAnswer === s.value
                      ? "text-[#2d8a80]"
                      : "text-white/50 group-hover:text-white/80"
                  }`}
                >
                  {s.value}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] leading-tight text-center whitespace-pre-line transition-colors duration-300 ${
                    currentAnswer === s.value
                      ? "text-[#2d8a80]/80"
                      : "text-white/30"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          {/* Back button */}
          {canGoBack && (
            <div className="text-center">
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm text-white/30 hover:text-white/60 transition-colors duration-300"
              >
                <ArrowLeft className="w-4 h-4" />
                前の質問に戻る
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
