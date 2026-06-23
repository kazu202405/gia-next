"use client";

// admin「ログ → アンケート」サブタブ。
// 売上ボトルネック診断（公開ツール /diagnosis）の回答一覧を表示する。
// diagnosis_submissions を anon キー＋管理者セッションで読む（RLS: is_admin() で SELECT 許可）。

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialCard } from "./EditorialChrome";
import { formatDateTime } from "./EditorialFormat";
import { DIMENSIONS } from "@/lib/diagnosis/questions";

interface SurveyRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  company: string | null;
  industry: string | null;
  total: number;
  grade: string | null;
  bottleneck_key: string | null;
  supply_gate: boolean;
  worry: string | null;
}

const DIM_LABEL: Record<string, string> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.key, d.title])
);

function gradeChipClass(grade: string | null): string {
  if (grade === "S" || grade === "A")
    return "bg-[#e9efe9] border-[#c5d3c8] text-[#3d6651]";
  if (grade === "B") return "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]";
  return "bg-[#f3e9e6] border-[#d8c4be] text-[#8a4538]";
}

export function SurveysTab() {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("diagnosis_submissions")
        .select(
          "id, created_at, name, email, company, industry, total, grade, bottleneck_key, supply_gate, worry"
        )
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows((data as SurveyRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-[#8a4538] py-8">
        読み込みに失敗しました：{error}
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-10 text-center">
        まだ診断アンケートの回答はありません。
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs text-gray-500">{rows.length}件の回答</p>
      {rows.map((r) => (
        <EditorialCard key={r.id} variant="row" className="px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1c3550] truncate">
                {r.name}
                {r.company && (
                  <span className="text-gray-500 font-normal ml-2">
                    {r.company}
                  </span>
                )}
              </p>
              <p className="text-[13px] text-gray-600 truncate">{r.email}</p>
              <p className="text-[12px] text-gray-500 mt-1">
                {r.industry && <span className="mr-2">{r.industry}</span>}
                ボトルネック：
                {r.bottleneck_key
                  ? (DIM_LABEL[r.bottleneck_key] ?? r.bottleneck_key)
                  : "—"}
                {r.supply_gate && (
                  <span className="ml-1 text-[#8a4538]">（供給制約）</span>
                )}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold ${gradeChipClass(
                  r.grade
                )}`}
              >
                {r.grade ?? "—"}・{r.total}
              </span>
              <p className="text-[11px] text-gray-400 mt-1.5">
                {formatDateTime(r.created_at)}
              </p>
            </div>
          </div>
          {r.worry && (
            <p className="text-[12px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
              悩み：{r.worry}
            </p>
          )}
        </EditorialCard>
      ))}
    </div>
  );
}
