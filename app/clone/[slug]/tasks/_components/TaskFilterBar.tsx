"use client";

// タスク一覧の検索＋フィルタ＋ソートバー。
// URL searchParams（q / status / priority / range / sort）を真実とし、
// 操作で router.push して Server Component のクエリを更新する。
// テキスト検索だけ debounce 300ms、それ以外（チップ）は即時反映。

import { useEffect, useRef, useState } from "react";
import {
  usePathname, useRouter, useSearchParams,
} from "next/navigation";
import {
  Search, X, Filter, Loader2, ArrowDown, ArrowUp,
} from "lucide-react";

const STATUSES = ["未着手", "進行中", "完了", "保留"] as const;
const PRIORITIES: Array<{ value: "高" | "中" | "低"; label: string }> = [
  { value: "高", label: "高" },
  { value: "中", label: "中" },
  { value: "低", label: "低" },
];
const RANGES: Array<{ value: string; label: string }> = [
  { value: "all", label: "全期間" },
  { value: "overdue", label: "期限切れ" },
  { value: "today", label: "今日まで" },
  { value: "week", label: "今週まで" },
  { value: "month", label: "今月まで" },
];

// ソートキーと向きを 1 文字列に詰める：`<field>_<dir>`
const SORT_OPTIONS: Array<{ value: string; label: string; icon: "up" | "down" }> = [
  { value: "due_asc", label: "期限が近い順", icon: "up" },
  { value: "due_desc", label: "期限が遠い順", icon: "down" },
  { value: "priority_asc", label: "優先度 高→低", icon: "up" },
  { value: "created_desc", label: "新しい順", icon: "down" },
  { value: "created_asc", label: "古い順", icon: "up" },
];

interface Props {
  filteredCount: number;
  totalCount: number;
}

export function TaskFilterBar({ filteredCount, totalCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const range = searchParams.get("range") ?? "all";
  const sort = searchParams.get("sort") ?? "due_asc";

  const hasActiveFilters =
    q.length > 0
    || status !== ""
    || priority !== ""
    || (range !== "" && range !== "all");

  const [qLocal, setQLocal] = useState(q);
  const lastSyncedQ = useRef(q);
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
    // sort はリセットしない（並び順は filter とは独立した嗜好）
    const params = new URLSearchParams();
    if (sort && sort !== "due_asc") params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <section className="bg-white border border-gray-200 rounded-md px-4 sm:px-5 py-3 space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={qLocal}
          onChange={(e) => setQLocal(e.target.value)}
          placeholder="タスク名・目的を検索"
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
        <ChipGroup label="状態">
          <Chip
            active={status === ""}
            onClick={() => setParam("status", null)}
          >
            すべて
          </Chip>
          {STATUSES.map((s) => (
            <Chip
              key={s}
              active={status === s}
              onClick={() => setParam("status", status === s ? null : s)}
            >
              {s}
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup label="優先度">
          <Chip
            active={priority === ""}
            onClick={() => setParam("priority", null)}
          >
            すべて
          </Chip>
          {PRIORITIES.map((p) => (
            <Chip
              key={p.value}
              active={priority === p.value}
              onClick={() =>
                setParam("priority", priority === p.value ? null : p.value)
              }
            >
              {p.label}
            </Chip>
          ))}
        </ChipGroup>

        <ChipGroup label="期限">
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

        <ChipGroup label="並び順">
          <select
            value={sort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="text-[11px] border border-gray-200 rounded pl-2 pr-7 py-1 bg-white focus:outline-none focus:border-[#1c3550] cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(() => {
            const opt = SORT_OPTIONS.find((o) => o.value === sort);
            if (!opt) return null;
            return opt.icon === "up" ? (
              <ArrowUp className="w-3 h-3 text-gray-400" aria-hidden />
            ) : (
              <ArrowDown className="w-3 h-3 text-gray-400" aria-hidden />
            );
          })()}
        </ChipGroup>

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
