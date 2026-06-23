"use client";

// プロフィール入力の負担を下げる「AIと話して埋める」モーダル。
// 0 から 23 個の空欄を埋めさせる代わりに、4 問に答えてもらい、AI が
// 重い自由文項目（肩書・サービス・ストーリー4つ・人柄・つながりたい人）を下書きする。
// 返ってきた下書きは、親の applyDraft で「空欄だけ」に反映される（既存入力は壊さない）。

import { useState } from "react";
import { Sparkles, X, Loader2, AlertCircle } from "lucide-react";

export interface IntakeDraft {
  [key: string]: string;
}

const QUESTIONS: {
  key: "work" | "story" | "connect" | "personality";
  label: string;
  placeholder: string;
  rows: number;
}[] = [
  {
    key: "work",
    label: "お仕事を一言で。誰に、何を提供していますか？",
    placeholder: "例）中小企業の社長向けに、補助金申請の代行とコンサルをしています。大阪中心。",
    rows: 3,
  },
  {
    key: "story",
    label: "今の仕事に至った経緯・転機・これからやりたいことは？",
    placeholder: "例）元々は銀行員で…独立のきっかけは…今は…ゆくゆくは…",
    rows: 5,
  },
  {
    key: "connect",
    label: "どんな人とつながりたいですか？",
    placeholder: "例）士業の方、地域で頑張る経営者、紹介を一緒に回せる仲間。",
    rows: 2,
  },
  {
    key: "personality",
    label: "人柄が伝わるもの（好きなもの・趣味・大事にしている価値観・学生時代など）",
    placeholder: "例）サウナと日本酒が好き。最近はランニング。「義理人情」を大事にしてます。",
    rows: 3,
  },
];

export function AiIntakeDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (draft: IntakeDraft) => void;
}) {
  const [answers, setAnswers] = useState({
    work: "",
    story: "",
    connect: "",
    personality: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const anyAnswered = Object.values(answers).some((v) => v.trim().length > 0);

  const handleSubmit = async () => {
    setError(null);
    if (!anyAnswered) {
      setError("1つ以上の質問に答えてください。");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/profile/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; draft?: IntakeDraft; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.draft) {
        setError(data?.error ?? "下書きの生成に失敗しました。");
        setPending(false);
        return;
      }
      onApply(data.draft);
      setPending(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信エラー");
      setPending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={pending ? undefined : onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl my-4">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1c3550]/5">
              <Sparkles className="w-4 h-4 text-[#c08a3e]" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-base font-semibold text-[#1c3550]">
                AIと話して埋める
              </h2>
              <p className="text-[11px] text-gray-500">
                4問に答えるだけ。AIが下書きを作って空欄に入れます（あとで自由に直せます）
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            aria-label="閉じる"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <label className="block text-[13px] font-semibold text-gray-800 mb-1.5">
                {q.label}
              </label>
              <textarea
                value={answers[q.key]}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                }
                rows={q.rows}
                placeholder={q.placeholder}
                className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10 resize-y"
              />
            </div>
          ))}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-[12px] text-red-700">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-3 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !anyAnswered}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1c3550] text-white text-xs font-bold tracking-[0.04em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                AIが下書き中…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                下書きを作る
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
