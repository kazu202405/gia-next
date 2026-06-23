"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { DIMENSIONS, INDUSTRIES } from "@/lib/diagnosis/questions";
import {
  scoreDiagnosis,
  type Answers,
  type DiagnosisResult,
} from "@/lib/diagnosis/score";
import { DiagnosisReport } from "./DiagnosisReport";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// step 0 = イントロ（名前・メール必須＋業種）, 1..5 = 各項目, 送信で result へ
export function DiagnosisForm() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const [worry, setWorry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);

  if (result) {
    return (
      <DiagnosisReport
        result={result}
        advice={advice}
        industry={industry}
        onRestart={() => {
          setResult(null);
          setAdvice(null);
          setStep(0);
          setAnswers({});
          setIndustry("");
          setName("");
          setEmail("");
          setCompany("");
          setWorry("");
        }}
      />
    );
  }

  const contactReady = name.trim().length > 0 && EMAIL_RE.test(email.trim());

  // ─── イントロ（名前・メール必須） ───
  if (step === 0) {
    return (
      <div>
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
            <span>DIAGNOSIS</span>
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
          </div>
          <h1 className="font-serif text-[26px] sm:text-[32px] font-bold text-[var(--gia-deck-navy)] tracking-[0.04em] leading-[1.4] mt-4">
            売上ボトルネック診断
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            20の質問で、あなたの売上の“詰まり”を特定します。
            <br className="hidden sm:block" />
            集客・成約・単価・リピート・キャパの5項目を採点し、
            <br className="hidden sm:block" />
            <strong className="text-[var(--gia-deck-navy)]">
              まず打つべき一手を1つ
            </strong>
            に絞り、AIが個別アドバイスもお返しします。
          </p>
          <p className="text-[11px] text-[var(--gia-deck-sub)] mt-3">
            所要 約2分／無料／結果はその場で表示
          </p>
        </header>

        <div className="bg-white rounded-2xl border border-[var(--gia-deck-line)] p-6 sm:p-8 shadow-[0_1px_2px_rgba(28,53,80,0.04)]">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--gia-deck-navy)] mb-1.5">
                お名前
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：山田 太郎"
                className="w-full rounded-xl border border-[var(--gia-deck-line)] px-4 py-3 text-sm text-[var(--gia-deck-ink)] focus:outline-none focus:border-[var(--gia-deck-navy)]/40"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--gia-deck-navy)] mb-1.5">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="例：you@example.com"
                className="w-full rounded-xl border border-[var(--gia-deck-line)] px-4 py-3 text-sm text-[var(--gia-deck-ink)] focus:outline-none focus:border-[var(--gia-deck-navy)]/40"
              />
              <p className="text-[11px] text-[var(--gia-deck-sub)] mt-1.5">
                診断結果の控えと、個別アドバイスのお届けに使います。
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--gia-deck-navy)] mb-1.5">
                会社名
                <span className="text-[11px] font-normal text-[var(--gia-deck-sub)] ml-1">
                  （任意）
                </span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="例：株式会社○○"
                className="w-full rounded-xl border border-[var(--gia-deck-line)] px-4 py-3 text-sm text-[var(--gia-deck-ink)] focus:outline-none focus:border-[var(--gia-deck-navy)]/40"
              />
            </div>
          </div>

          <p className="text-sm font-semibold text-[var(--gia-deck-navy)] mb-3">
            業種・タイプ
            <span className="text-[11px] font-normal text-[var(--gia-deck-sub)] ml-1">
              （任意）
            </span>
          </p>
          <div className="flex flex-wrap gap-2 mb-7">
            {INDUSTRIES.map((label) => (
              <button
                key={label}
                onClick={() => setIndustry(label)}
                className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                  industry === label
                    ? "border-[var(--gia-deck-navy)] bg-[var(--gia-deck-navy)] text-white"
                    : "border-[var(--gia-deck-line)] text-[var(--gia-deck-ink)] hover:border-[var(--gia-deck-navy)]/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!contactReady}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold py-4 px-6 hover:bg-[var(--gia-deck-navy-deep)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            診断をはじめる
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── 各項目ステップ ───
  const dim = DIMENSIONS[step - 1];
  const isLastDim = step === DIMENSIONS.length;
  const allAnswered = dim.questions.every((q) => answers[q.id] !== undefined);
  const progress = Math.round((step / DIMENSIONS.length) * 100);

  const select = (qid: string, points: number) =>
    setAnswers((a) => ({ ...a, [qid]: points }));

  const submit = async () => {
    setSubmitting(true);
    let res = scoreDiagnosis(answers); // 通信失敗時のフォールバック
    let adv: string | null = null;
    try {
      const r = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, industry, worry, answers }),
      });
      if (r.ok) {
        const data = await r.json();
        if (data.result) res = data.result;
        adv = data.advice ?? null;
      }
    } catch {
      // ネットワーク失敗でもローカル採点結果は見せる
    }
    setAdvice(adv);
    setResult(res);
    setSubmitting(false);
  };

  const next = () => {
    if (isLastDim) {
      submit();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div>
      {/* 進捗 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-[11px] text-[var(--gia-deck-sub)] mb-2">
          <span>
            ステップ {step} / {DIMENSIONS.length}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--gia-deck-line)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--gia-deck-gold)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 項目見出し */}
      <div className="mb-6">
        <p className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em] uppercase">
          {dim.no} / 5 ― {dim.subtitle}
        </p>
        <h2 className="font-serif text-2xl font-bold text-[var(--gia-deck-navy)] tracking-[0.04em] mt-1">
          {dim.title}
        </h2>
      </div>

      {/* 質問群 */}
      <div className="space-y-5">
        {dim.questions.map((q, qi) => (
          <div
            key={q.id}
            className="bg-white rounded-2xl border border-[var(--gia-deck-line)] p-5 sm:p-6 shadow-[0_1px_2px_rgba(28,53,80,0.04)]"
          >
            <p className="text-sm font-semibold text-[var(--gia-deck-navy)] mb-3.5">
              <span className="text-[var(--gia-deck-sub)] mr-1.5">Q{qi + 1}.</span>
              {q.text}
            </p>
            <div className="grid gap-2">
              {q.choices.map((c) => {
                const selected = answers[q.id] === c.points;
                return (
                  <button
                    key={c.label}
                    onClick={() => select(q.id, c.points)}
                    className={`flex items-center gap-2.5 text-left text-sm px-4 py-3 rounded-xl border transition-colors ${
                      selected
                        ? "border-[var(--gia-deck-navy)] bg-[var(--gia-deck-navy)]/[0.04] text-[var(--gia-deck-navy)] font-medium"
                        : "border-[var(--gia-deck-line)] text-[var(--gia-deck-ink)] hover:border-[var(--gia-deck-navy)]/40"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-4 h-4 rounded-full border flex-shrink-0 ${
                        selected
                          ? "border-[var(--gia-deck-navy)] bg-[var(--gia-deck-navy)]"
                          : "border-[var(--gia-deck-line)]"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 text-white" />}
                    </span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* 最終ステップ：任意の悩み（AIへの相談内容に使う） */}
        {isLastDim && (
          <div className="bg-white rounded-2xl border border-[var(--gia-deck-line)] p-5 sm:p-6 shadow-[0_1px_2px_rgba(28,53,80,0.04)]">
            <p className="text-sm font-semibold text-[var(--gia-deck-navy)] mb-1">
              今いちばんの悩みを一言
              <span className="text-[11px] font-normal text-[var(--gia-deck-sub)] ml-1">
                （任意・AIがこれを踏まえてアドバイスします）
              </span>
            </p>
            <textarea
              value={worry}
              onChange={(e) => setWorry(e.target.value)}
              rows={2}
              placeholder="例：問い合わせはあるのに、なかなか決まらない…"
              className="w-full mt-2 rounded-xl border border-[var(--gia-deck-line)] px-4 py-3 text-sm text-[var(--gia-deck-ink)] focus:outline-none focus:border-[var(--gia-deck-navy)]/40 resize-none"
            />
          </div>
        )}
      </div>

      {/* ナビ */}
      <div className="flex items-center justify-between gap-3 mt-7">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--gia-deck-sub)] hover:text-[var(--gia-deck-navy)] transition-colors px-3 py-2 disabled:opacity-40"
        >
          <ArrowLeft className="w-4 h-4" />
          戻る
        </button>
        <button
          onClick={next}
          disabled={!allAnswered || submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold py-3.5 px-7 hover:bg-[var(--gia-deck-navy-deep)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              結果を作成中…
            </>
          ) : (
            <>
              {isLastDim ? "結果を見る" : "次へ"}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
