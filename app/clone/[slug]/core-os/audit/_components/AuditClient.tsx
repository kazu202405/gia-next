"use client";

// Core OS 棚卸し（健康診断）の実行＋結果表示。
// ボタンで /api/clone/coreos-audit を叩き、AIの監査結果（総評＋指摘）を表示する。
// 自動変更はしない：提案を読んで、各セクションで本人が手直しする運用。

import { useState } from "react";
import { Loader2, Sparkles, Stethoscope } from "lucide-react";
import { EditorialCard } from "@/app/admin/_components/EditorialChrome";

interface Finding {
  area: string;
  type: string;
  title: string;
  detail: string;
  action: string;
  suggestion: string;
}

const TYPE_LABEL: Record<string, string> = {
  duplicate: "重複",
  contradiction: "矛盾",
  stale: "陳腐化",
  too_abstract: "抽象的すぎ",
  bloat: "肥大",
};

const TYPE_CLASS: Record<string, string> = {
  duplicate: "bg-[#f1f4f7] border-[#d6dde5] text-[#1c3550]",
  contradiction: "bg-[#f3e9e6] border-[#d8c4be] text-[#8a4538]",
  stale: "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]",
  too_abstract: "bg-[#f1f4f7] border-[#d6dde5] text-[#1c3550]",
  bloat: "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]",
};

const ACTION_LABEL: Record<string, string> = {
  keep: "残す",
  merge: "統合",
  rewrite: "書き直し",
  retire: "引退",
};

export function AuditClient({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [overall, setOverall] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/clone/coreos-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "棚卸しに失敗しました");
      } else {
        setOverall(data.overall ?? "");
        setFindings((data.findings ?? []) as Finding[]);
      }
    } catch {
      setError("通信に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <EditorialCard className="px-6 py-6">
        <p className="text-[13px] text-gray-600 leading-relaxed mb-4">
          AIが今の Core OS（判断軸の脳）を点検し、
          <strong className="text-[#1c3550]">
            重複・矛盾・陳腐化・抽象的すぎ・肥大
          </strong>
          を指摘して、直し方を提案します。Core OS は小さく鋭く保つほど右腕AIの判断が
          シャープになります。数ヶ月に一度の見直しにどうぞ。
          <br />
          <span className="text-gray-500">
            ※ 提案を出すだけで自動変更はしません。各セクションで手直ししてください。
          </span>
        </p>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1c3550] text-white text-sm font-semibold py-2.5 px-5 hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              点検中…（10〜20秒）
            </>
          ) : (
            <>
              <Stethoscope className="w-4 h-4" />
              棚卸しする
            </>
          )}
        </button>
      </EditorialCard>

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">{error}</p>
        </EditorialCard>
      )}

      {overall !== null && (
        <>
          <EditorialCard className="px-6 py-5">
            <p className="flex items-center gap-2 text-[13px] font-bold text-[#1c3550] mb-2">
              <Sparkles className="w-4 h-4 text-[#c08a3e]" />
              総評
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{overall}</p>
          </EditorialCard>

          {findings && findings.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                気になる点 {findings.length}件
              </p>
              {findings.map((f, i) => (
                <EditorialCard key={i} variant="row" className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${
                        TYPE_CLASS[f.type] ??
                        "bg-gray-50 border-gray-200 text-gray-600"
                      }`}
                    >
                      {TYPE_LABEL[f.type] ?? f.type}
                    </span>
                    {f.area && (
                      <span className="text-[11px] text-gray-500">{f.area}</span>
                    )}
                    {f.action && ACTION_LABEL[f.action] && (
                      <span className="ml-auto text-[11px] font-semibold text-[#c08a3e]">
                        → {ACTION_LABEL[f.action]}
                      </span>
                    )}
                  </div>
                  {f.title && (
                    <p className="text-[13.5px] font-bold text-[#1c3550]">
                      {f.title}
                    </p>
                  )}
                  {f.detail && (
                    <p className="text-[13px] text-gray-600 leading-relaxed mt-1">
                      {f.detail}
                    </p>
                  )}
                  {f.suggestion && (
                    <p className="text-[13px] text-[#1c3550] leading-relaxed mt-2 bg-[#fafbfc] border border-gray-100 rounded-lg px-3 py-2">
                      💡 {f.suggestion}
                    </p>
                  )}
                </EditorialCard>
              ))}
            </div>
          ) : (
            <EditorialCard className="px-6 py-8 text-center">
              <p className="text-sm text-[#1c3550]">
                大きな問題は見つかりませんでした。今の Core OS は良好です。
              </p>
            </EditorialCard>
          )}
        </>
      )}
    </div>
  );
}
