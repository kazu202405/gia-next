"use client";

// 会話ログ一覧の検索＋フィルタバー。
// URL searchParams（q / channel / importance / person / range）を真実とし、
// 各操作で router.push して Server Component のクエリを更新する。
// 検索テキストだけは debounce 300ms。それ以外（チップ）は即時反映。

import { useEffect, useMemo, useRef, useState } from "react";
import {
  usePathname, useRouter, useSearchParams,
} from "next/navigation";
import { Search, X, Filter, Loader2 } from "lucide-react";

const CHANNELS = ["Slack", "LINE", "Email", "対面", "電話", "その他"] as const;
const IMPORTANCES: Array<{ value: "S" | "A" | "B" | "C"; label: string }> = [
  { value: "S", label: "S 最重要" },
  { value: "A", label: "A 重要" },
  { value: "B", label: "B 通常" },
  { value: "C", label: "C 参考" },
];
const RANGES: Array<{ value: string; label: string }> = [
  { value: "all", label: "全期間" },
  { value: "month", label: "今月" },
  { value: "30d", label: "過去30日" },
  { value: "90d", label: "過去90日" },
];

export interface PersonCandidate {
  id: string;
  label: string;
  sublabel?: string | null;
}

interface Props {
  /** 人物フィルタ用の候補一覧。 */
  peopleCandidates: PersonCandidate[];
  /** フィルタ適用後の件数（page.tsx から SSR 結果を渡す）。 */
  filteredCount: number;
  /** テナント内の総会話件数。 */
  totalCount: number;
}

export function ConversationFilterBar({
  peopleCandidates, filteredCount, totalCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const channel = searchParams.get("channel") ?? "";
  const importance = searchParams.get("importance") ?? "";
  const personId = searchParams.get("person") ?? "";
  const range = searchParams.get("range") ?? "all";

  const hasActiveFilters =
    q.length > 0
    || channel !== ""
    || importance !== ""
    || personId !== ""
    || (range !== "" && range !== "all");

  // 検索ボックスのローカル state。URL とは debounce で同期する。
  const [qLocal, setQLocal] = useState(q);
  const lastSyncedQ = useRef(q);
  // 外から（戻る/進む等で）URL の q が変わった時はローカルも追従
  useEffect(() => {
    if (q !== lastSyncedQ.current) {
      setQLocal(q);
      lastSyncedQ.current = q;
    }
  }, [q]);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  // テキスト検索の debounce push
  useEffect(() => {
    if (qLocal === q) return;
    const t = setTimeout(() => {
      lastSyncedQ.current = qLocal;
      setParam("q", qLocal);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal]);

  const clearAll = () => {
    setQLocal("");
    lastSyncedQ.current = "";
    router.push(pathname);
  };

  const selectedPersonLabel = useMemo(() => {
    if (!personId) return null;
    return peopleCandidates.find((p) => p.id === personId)?.label ?? null;
  }, [personId, peopleCandidates]);

  return (
    <section className="bg-white border border-gray-200 rounded-md px-4 sm:px-5 py-3 space-y-3">
      {/* テキスト検索 */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          placeholder="要約・本文・次のアクションを検索"
          className="w-full border border-gray-200 rounded pl-8 pr-9 py-2 text-sm bg-white focus:outline-none focus:border-[#1c3550]"
        />
        {qLocal.length > 0 && qLocal !== q && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
        )}
        {qLocal.length > 0 && qLocal === q && (
          <button
            type="button"
            onClick={() => setQLocal("")}
            aria-label="検索文字をクリア"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* チップ群（チャンネル / 重要度 / 期間 / 人物） */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <ChipGroup label="チャンネル">
          <Chip
            active={channel === ""}
            onClick={() => setParam("channel", null)}
          >
            すべて
          </Chip>
          {CHANNELS.map((c) => (
            <Chip
              key={c}
              active={channel === c}
              onClick={() => setParam("channel", channel === c ? null : c)}
            >
              {c}
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup label="重要度">
          <Chip
            active={importance === ""}
            onClick={() => setParam("importance", null)}
          >
            すべて
          </Chip>
          {IMPORTANCES.map((i) => (
            <Chip
              key={i.value}
              active={importance === i.value}
              onClick={() =>
                setParam("importance", importance === i.value ? null : i.value)
              }
            >
              {i.label}
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup label="期間">
          {RANGES.map((r) => (
            <Chip
              key={r.value}
              active={range === r.value || (r.value === "all" && !range)}
              onClick={() => setParam("range", r.value)}
            >
              {r.label}
            </Chip>
          ))}
        </ChipGroup>

        {/* 人物：候補が多くなったら select。今は単純な select で */}
        <ChipGroup label="人物">
          <select
            value={personId}
            onChange={(e) => setParam("person", e.target.value || null)}
            className="text-[11px] border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-[#1c3550] cursor-pointer max-w-[12rem] truncate"
          >
            <option value="">すべて</option>
            {peopleCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          {selectedPersonLabel && (
            <button
              type="button"
              onClick={() => setParam("person", null)}
              aria-label="人物フィルタを解除"
              className="inline-flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </ChipGroup>

        {/* 件数と一括クリア */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-gray-500 tabular-nums">
            {hasActiveFilters ? (
              <>
                <span className="font-bold text-[#1c3550]">{filteredCount}</span>
                <span className="mx-1 text-gray-300">/</span>
                <span>{totalCount}</span>
                <span className="ml-1">件</span>
              </>
            ) : (
              <>
                <span className="font-bold text-[#1c3550]">{totalCount}</span>
                <span className="ml-1">件</span>
              </>
            )}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#1c3550] transition-colors"
            >
              <Filter className="w-3 h-3" />
              フィルタ解除
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ChipGroup({
  label, children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] tracking-[0.18em] text-gray-400 uppercase mr-0.5">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1">{children}</div>
    </div>
  );
}

function Chip({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] transition-colors ${
        active
          ? "bg-[#1c3550] border-[#1c3550] text-white font-bold"
          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}
