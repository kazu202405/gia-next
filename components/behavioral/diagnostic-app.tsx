"use client";

import { useState, useCallback } from "react";
import { DiagnosticIntro } from "./diagnostic-intro";
import { DiagnosticQuestion, type Question } from "./diagnostic-question";
import { DiagnosticResult } from "./diagnostic-result";

// ── Question Data ──────────────────────────────────

const DOMAINS = [
  "意思決定",
  "習慣設計",
  "コミュニケーション",
  "リーダーシップ",
  "モチベーション",
  "環境設計",
] as const;

const DOMAIN_ANGLES = [0, 60, 120, 180, 240, 300];

const QUESTIONS: Question[] = [
  // Domain 0: 意思決定
  { id: 1, domain: "意思決定", domainIndex: 0, text: "重要な判断は、データや事実に基づいて行われていますか？" },
  { id: 2, domain: "意思決定", domainIndex: 0, text: "意思決定のプロセスが明確で、チーム全員が理解していますか？" },
  { id: 3, domain: "意思決定", domainIndex: 0, text: "判断に迷った際、客観的な基準に立ち返る仕組みがありますか？" },
  // Domain 1: 習慣設計
  { id: 4, domain: "習慣設計", domainIndex: 1, text: "新しい業務プロセスは、導入3ヶ月後も機能していますか？" },
  { id: 5, domain: "習慣設計", domainIndex: 1, text: "日常業務の中に、成果につながるルーティンが組み込まれていますか？" },
  { id: 6, domain: "習慣設計", domainIndex: 1, text: "「やるべきこと」が自然に実行される仕組みが整っていますか？" },
  // Domain 2: コミュニケーション
  { id: 7, domain: "コミュニケーション", domainIndex: 2, text: "チーム内で率直なフィードバックが日常的に行われていますか？" },
  { id: 8, domain: "コミュニケーション", domainIndex: 2, text: "情報共有の仕組みが整い、必要な情報が必要な人に届いていますか？" },
  { id: 9, domain: "コミュニケーション", domainIndex: 2, text: "会議は目的が明確で、参加者全員が発言できる場になっていますか？" },
  // Domain 3: リーダーシップ
  { id: 10, domain: "リーダーシップ", domainIndex: 3, text: "リーダー不在でも、チームは自律的に動けていますか？" },
  { id: 11, domain: "リーダーシップ", domainIndex: 3, text: "リーダーは指示だけでなく、メンバーの行動を引き出す関わりをしていますか？" },
  { id: 12, domain: "リーダーシップ", domainIndex: 3, text: "組織のビジョンが浸透し、日々の判断基準として機能していますか？" },
  // Domain 4: モチベーション
  { id: 13, domain: "モチベーション", domainIndex: 4, text: "メンバーは仕事に対して内発的な動機を持っていますか？" },
  { id: 14, domain: "モチベーション", domainIndex: 4, text: "成果だけでなく、プロセスや努力も適切に評価されていますか？" },
  { id: 15, domain: "モチベーション", domainIndex: 4, text: "メンバーが自分の成長を実感できる機会が定期的にありますか？" },
  // Domain 5: 環境設計
  { id: 16, domain: "環境設計", domainIndex: 5, text: "オフィス環境や業務ツールは、生産性を高める設計になっていますか？" },
  { id: 17, domain: "環境設計", domainIndex: 5, text: "集中作業とコラボレーション、それぞれに適した環境が用意されていますか？" },
  { id: 18, domain: "環境設計", domainIndex: 5, text: "業務の優先順位が明確で、不要なタスクを排除する仕組みがありますか？" },
];

// ── Domain Advice ──────────────────────────────────

const DOMAIN_ADVICE: Record<string, { high: string; mid: string; low: string }> = {
  意思決定: {
    high: "データドリブンな文化が根付いています。意思決定の透明性をさらに高め、チーム全体の判断力を底上げしましょう。",
    mid: "基本的な判断プロセスはありますが、感覚に頼る場面も。重要な判断にチェックリストを導入すると効果的です。",
    low: "意思決定が属人化している可能性があります。まずは判断基準の明文化と、データ収集の仕組みづくりから始めましょう。",
  },
  習慣設計: {
    high: "良い習慣が組織に定着しています。定着した習慣を可視化し、新メンバーへの引き継ぎにも活かしましょう。",
    mid: "プロセスは作られますが定着に課題あり。「トリガー→行動→報酬」のループを意識した設計が効果的です。",
    low: "新しい取り組みが続かない傾向があります。小さな習慣から始め、既存の行動に紐づける設計が必要です。",
  },
  コミュニケーション: {
    high: "オープンなコミュニケーション文化が築けています。心理的安全性を維持しながら、建設的な議論をさらに促進しましょう。",
    mid: "情報は流れていますが、双方向性に改善の余地あり。定期的な1on1やフィードバックの仕組みを強化しましょう。",
    low: "情報の断絶やサイロ化が起きている可能性があります。まずは安全に発言できる場づくりと、情報共有チャネルの整備を。",
  },
  リーダーシップ: {
    high: "自律型のリーダーシップが機能しています。次世代リーダーの育成にも注力し、組織の持続的成長を目指しましょう。",
    mid: "リーダーの存在感はありますが、依存度にばらつき。権限委譲とビジョン共有のバランスを見直すと効果的です。",
    low: "リーダー依存が強い状態です。まずはリーダーの役割を「管理者」から「環境設計者」にシフトすることを検討しましょう。",
  },
  モチベーション: {
    high: "内発的動機づけが高い組織です。個人の強みを活かせる機会をさらに増やし、エンゲージメントを維持しましょう。",
    mid: "モチベーションはありますが、外発的要因に偏りがち。自律性・有能感・関係性の3要素を意識した環境づくりを。",
    low: "モチベーションの低下が見られます。まずは「小さな成功体験」を積める仕組みと、適切な承認・評価の場を設けましょう。",
  },
  環境設計: {
    high: "生産性を支える環境が整っています。定期的な見直しを行い、変化する働き方に適応し続けましょう。",
    mid: "基本的な環境はありますが最適化の余地あり。業務フローの見直しと、集中を妨げる要因の特定が効果的です。",
    low: "環境が生産性を阻害している可能性があります。まずは最も時間を浪費している業務プロセスの改善から着手しましょう。",
  },
};

function getAdvice(domain: string, score: number): string {
  const advice = DOMAIN_ADVICE[domain];
  if (!advice) return "";
  if (score >= 70) return advice.high;
  if (score >= 45) return advice.mid;
  return advice.low;
}

// ── State Types ────────────────────────────────────

type Phase = "intro" | "questions" | "result";

// ── Component ──────────────────────────────────────

export function DiagnosticApp() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const handleStart = useCallback(() => {
    setPhase("questions");
    setCurrentQuestionIndex(0);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleAnswer = useCallback(
    (questionId: number, score: number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: score }));

      // Auto-advance after a short delay
      setTimeout(() => {
        if (currentQuestionIndex < QUESTIONS.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setPhase("result");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 300);
    },
    [currentQuestionIndex]
  );

  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  const handleRetry = useCallback(() => {
    setPhase("intro");
    setCurrentQuestionIndex(0);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Calculate domain results
  const calculateResults = () => {
    return DOMAINS.map((domain, i) => {
      const domainQuestions = QUESTIONS.filter((q) => q.domainIndex === i);
      const domainAnswers = domainQuestions.map((q) => answers[q.id] || 3);
      const average = domainAnswers.reduce((a, b) => a + b, 0) / domainAnswers.length;
      const score = Math.round(average * 20);

      return {
        label: domain,
        score,
        angle: DOMAIN_ANGLES[i],
        advice: getAdvice(domain, score),
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1f33]">
      {phase === "intro" && <DiagnosticIntro onStart={handleStart} />}

      {phase === "questions" && (
        <DiagnosticQuestion
          question={QUESTIONS[currentQuestionIndex]}
          currentIndex={currentQuestionIndex}
          totalQuestions={QUESTIONS.length}
          currentAnswer={answers[QUESTIONS[currentQuestionIndex].id]}
          onAnswer={handleAnswer}
          onBack={handleBack}
          canGoBack={currentQuestionIndex > 0}
        />
      )}

      {phase === "result" && (
        <DiagnosticResult
          domainResults={calculateResults()}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
