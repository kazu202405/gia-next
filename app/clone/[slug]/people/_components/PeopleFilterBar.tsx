"use client";

// 人物一覧の検索＋フィルタバー。
// URL searchParams（q / importance / temperature / met_context / has_action）が真実。
// 並び順はテーブルヘッダー（SortableTableHeader）側に任せる。

import { useEffect, useRef, useState } from "react";
import {
  usePathname, useRouter, useSearchParams,
} from "next/navigation";
import { Search, X, Filter, Loader2, Bell } from "lucide-react";
import { MultiSelectDropdown } from "@/components/nav/MultiSelectDropdown";

const IMPORTANCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "S", label: "S 最重要" },
  { value: "A", label: "A 重要" },
  { value: "B", label: "B 通常" },
  { value: "C", label: "C 参考" },
];
const TEMPERATURE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "熱い", label: "熱い" },
  { value: "様子見", label: "様子見" },
  { value: "冷えてる", label: "冷えてる" },
];

function parseCsvParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

interface MetContextOption {
  value: string;
  count: number;
}

interface Props {
  filteredCount: number;
  totalCount: number;
  /** met_context のユニーク値一覧（page.tsx で集計して渡す） */
  metContextOptions: MetContextOption[];
}

export function PeopleFilterBar({
  filteredCount, totalCount, metContextOptions,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const importances = parseCsvParam(searchParams.get("importance"));
  const temperatures = parseCsvParam(searchParams.get("temperature"));
  const metContexts = parseCsvParam(searchParams.get("met_context"));
  const hasAction = searchParams.get("has_action") === "1";

  const hasActiveFilters =
    q.length > 0
    || importances.length > 0
    || temperatures.length > 0
    || metContexts.length > 0
    || hasAction;

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
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const setMultiParam = (key: string, values: string[]) => {
    if (values.length === 0) setParam(key, null);
    else setParam(key, values.join(","));
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
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
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
          placeholder="名前・会社名・役職を検索"
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
        <MultiSelectDropdown
          label="重要度"
          options={IMPORTANCE_OPTIONS}
          values={importances}
          onChange={(next) => setMultiParam("importance", next)}
        />

        <MultiSelectDropdown
          label="温度感"
          options={TEMPERATURE_OPTIONS}
          values={temperatures}
          onChange={(next) => setMultiParam("temperature", next)}
        />

        {metContextOptions.length > 0 && (
          <MultiSelectDropdown
            label="出会った場所"
            options={metContextOptions.map((o) => ({
              value: o.value,
              label: o.value,
              sublabel: o.count > 1 ? `${o.count}名` : null,
            }))}
            values={metContexts}
            onChange={(next) => setMultiParam("met_context", next)}
            minWidth="14rem"
          />
        )}

        {/* 次のアクションありトグル（要対応の人を絞る） */}
        <button
          type="button"
          onClick={() => setParam("has_action", hasAction ? null : "1")}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors ${
            hasAction
              ? "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c] font-bold"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          <Bell className="w-3 h-3" aria-hidden />
          次のアクションあり
        </button>

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
