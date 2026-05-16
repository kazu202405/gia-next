"use client";

// 鑑定対象の入力フォーム。名前 / 性別 / 生年月日 / （任意）時刻。
// Phase 1a は applicants 連携なし、手入力のみ。
// 数値はすべて <select> プルダウンで（上下スピナー回避＝ユーザー要望）。

import { YEAR_OPTIONS, MONTH_OPTIONS, DAY_OPTIONS } from "./KanshiSearch";

export interface SubjectInput {
  name: string;
  gender: "男性" | "女性" | "未指定";
  year: number;
  month: number;
  day: number;
  hour: number | null; // 0-23、未入力なら null
  birthplace: string;  // 出生地（参考表示・計算には未使用）
}

interface Props {
  value: SubjectInput;
  onChange: (next: SubjectInput) => void;
  onSubmit: () => void;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

export function BirthForm({ value, onChange, onSubmit }: Props) {
  const patch = (p: Partial<SubjectInput>) => onChange({ ...value, ...p });

  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6">
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold">
          SUBJECT / 鑑定対象
        </span>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="grid grid-cols-1 sm:grid-cols-12 gap-3"
      >
        <Field label="お名前" cls="sm:col-span-4">
          <input
            type="text"
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="山田 太郎"
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:border-[#1c3550] focus:outline-none"
          />
        </Field>

        <Field label="性別" cls="sm:col-span-2">
          <select
            value={value.gender}
            onChange={(e) => patch({ gender: e.target.value as SubjectInput["gender"] })}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:border-[#1c3550] focus:outline-none cursor-pointer"
          >
            <option value="未指定">未指定</option>
            <option value="男性">男性</option>
            <option value="女性">女性</option>
          </select>
        </Field>

        <Field label="生年" cls="sm:col-span-2">
          <NumSelect value={value.year} options={YEAR_OPTIONS} suffix="年"
            onChange={(v) => patch({ year: v })} />
        </Field>
        <Field label="月" cls="sm:col-span-1">
          <NumSelect value={value.month} options={MONTH_OPTIONS} suffix="月"
            onChange={(v) => patch({ month: v })} />
        </Field>
        <Field label="日" cls="sm:col-span-1">
          <NumSelect value={value.day} options={DAY_OPTIONS} suffix="日"
            onChange={(v) => patch({ day: v })} />
        </Field>

        <Field label="時刻（任意）" cls="sm:col-span-2">
          <select
            value={value.hour ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              patch({ hour: v === "" ? null : Number(v) });
            }}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono bg-white focus:border-[#1c3550] focus:outline-none cursor-pointer"
          >
            <option value="">未指定</option>
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>{h}時</option>
            ))}
          </select>
        </Field>

        <Field label="出生地（参考）" cls="sm:col-span-8">
          <input
            type="text"
            value={value.birthplace}
            onChange={(e) => patch({ birthplace: e.target.value })}
            placeholder="例：静岡県掛川市"
            className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:border-[#1c3550] focus:outline-none"
          />
        </Field>

        <div className="sm:col-span-4 flex items-end">
          <button
            type="submit"
            className="ml-auto inline-flex items-center justify-center px-5 py-2 bg-[#1c3550] text-white text-sm font-semibold rounded hover:bg-[#142640]"
          >
            鑑定する
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, cls = "", children }: { label: string; cls?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${cls}`}>
      <span className="block text-[10px] tracking-[0.2em] text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

function NumSelect({
  value, options, suffix, onChange,
}: {
  value: number; options: number[]; suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono bg-white focus:border-[#1c3550] focus:outline-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}{suffix ?? ""}</option>
      ))}
    </select>
  );
}
