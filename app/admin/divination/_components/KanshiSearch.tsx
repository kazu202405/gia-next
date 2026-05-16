"use client";

// 暦検索パネル — 任意の日付を入れると年柱・月柱・日柱の干支を表示する。
// デフォルトは「今日」。「今年の午年の午月の…」みたいな確認に使う。

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  getYearKanshi, getMonthKanshi, getDayKanshi,
} from "@/lib/divination/kanshi/calc";
import { KAN_TO_GOGYO, SHI_TO_GOGYO } from "@/lib/divination/kanshi/constants";

interface Props {
  /** 任意。日付選択を結果鑑定の生年月日入力にコピーするためのコールバック。 */
  onPick?: (date: { year: number; month: number; day: number }) => void;
}

export function KanshiSearch({ onPick }: Props) {
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1);
  const [day, setDay] = useState<number>(today.getDate());

  const result = useMemo(() => {
    const [yKan, yShi] = getYearKanshi(year, month, day);
    const [mKan, mShi] = getMonthKanshi(year, month, day, yKan);
    const [dKan, dShi] = getDayKanshi(year, month, day);
    return {
      year: { kan: yKan, shi: yShi },
      month: { kan: mKan, shi: mShi },
      day: { kan: dKan, shi: dShi },
    };
  }, [year, month, day]);

  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Search className="w-4 h-4 text-[#c08a3e]" />
        <h2 className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold">
          KOYOMI / 暦検索
        </h2>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <SelectField label="年" value={year} options={YEAR_OPTIONS} onChange={setYear} width="w-24" suffix="年" />
        <SelectField label="月" value={month} options={MONTH_OPTIONS} onChange={setMonth} width="w-16" suffix="月" />
        <SelectField label="日" value={day} options={DAY_OPTIONS} onChange={setDay} width="w-16" suffix="日" />
        <button
          type="button"
          onClick={() => {
            const t = new Date();
            setYear(t.getFullYear());
            setMonth(t.getMonth() + 1);
            setDay(t.getDate());
          }}
          className="text-[12px] text-gray-600 underline-offset-2 hover:underline"
        >
          今日に戻す
        </button>
        {onPick && (
          <button
            type="button"
            onClick={() => onPick({ year, month, day })}
            className="ml-auto text-[12px] text-[#1c3550] border border-[#1c3550]/30 rounded px-3 py-1 hover:bg-[#1c3550]/5"
          >
            この日付を鑑定対象に
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <KanshiCell label="年柱" kan={result.year.kan} shi={result.year.shi} />
        <KanshiCell label="月柱" kan={result.month.kan} shi={result.month.shi} />
        <KanshiCell label="日柱" kan={result.day.kan} shi={result.day.shi} />
      </div>

      <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
        ※ 年柱は立春、月柱は節入り日で切り替わるため、暦上の月日と一致しないことがあります。
      </p>
    </section>
  );
}

// 年月日プルダウンの選択肢。年は 1900〜2099 の 200 通り、月は 1〜12、日は 1〜31。
const YEAR_OPTIONS = Array.from({ length: 200 }, (_, i) => 1900 + i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

export function SelectField({
  label, value, options, onChange, width, suffix,
}: {
  label: string; value: number; options: number[];
  onChange: (v: number) => void; width: string; suffix?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.2em] text-gray-500 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${width} border border-gray-300 rounded px-2 py-1.5 text-sm font-mono bg-white focus:border-[#1c3550] focus:outline-none cursor-pointer`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}{suffix ?? ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export { YEAR_OPTIONS, MONTH_OPTIONS, DAY_OPTIONS };

function KanshiCell({ label, kan, shi }: { label: string; kan: string; shi: string }) {
  const kanG = KAN_TO_GOGYO[kan as keyof typeof KAN_TO_GOGYO];
  const shiG = SHI_TO_GOGYO[shi as keyof typeof SHI_TO_GOGYO];
  return (
    <div className="border border-gray-200 rounded p-3 bg-[#fafbfc] text-center">
      <div className="text-[10px] tracking-[0.2em] text-gray-500 mb-1">{label}</div>
      <div className="font-serif text-2xl font-bold text-[#1c3550] tracking-wide">
        {kan}{shi}
      </div>
      <div className="text-[11px] text-gray-500 mt-1">
        {kan}：{kanG} / {shi}：{shiG}
      </div>
    </div>
  );
}
