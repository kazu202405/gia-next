"use client";

// 多値選択ドロップダウン。ボタンを押すとチェックボックス付きリストが開き、
// 複数のオプションを ON/OFF できる。URL searchParams にはカンマ区切りで保存する
// 想定（[呼び出し側]で values.join(",") して URL に書く）。
//
// 設計判断:
//   - 開閉は内部 state。外側クリック / Escape で閉じる。
//   - 「すべて」項目は持たず、values が空なら自動的に「すべて」扱い（表示も「すべて」）。
//   - 選択数が増えても可視性を保つため、ボタン表示は label と件数バッジに圧縮。
//   - 単一値運用したい場合は MultiSelectDropdown を使わず素の select で十分。
//
// 使い方例:
//   <MultiSelectDropdown
//     label="状態"
//     options={[{value:"未着手", label:"未着手"}, ...]}
//     values={statusList}
//     onChange={(next) => setParam("status", next.join(","))}
//   />

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** 任意のサブテキスト（例：会社名）。1行に薄文字で添える。 */
  sublabel?: string | null;
}

interface Props {
  /** ボタン左に出すラベル（例：「状態」）。 */
  label: string;
  options: MultiSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
  /** values=[] のときのボタン表示。デフォルト「すべて」。 */
  emptyText?: string;
  /** ドロップダウンの最小幅。 */
  minWidth?: string;
}

export function MultiSelectDropdown({
  label, options, values, onChange,
  emptyText = "すべて", minWidth = "12rem",
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // 外側クリック / Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 開いた直後に先頭項目にフォーカス（キーボードで操作しやすく）
  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const clear = () => {
    onChange([]);
    setOpen(false);
  };

  const hasSelection = values.length > 0;

  // ボタンの表示テキスト
  let display: string;
  if (!hasSelection) {
    display = emptyText;
  } else if (values.length === 1) {
    display = options.find((o) => o.value === values[0])?.label ?? values[0];
  } else {
    display = `${values.length}件選択中`;
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1.5">
      <span className="text-[10px] tracking-[0.18em] text-gray-400 uppercase">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] transition-colors max-w-[14rem] ${
          hasSelection
            ? "bg-[#1c3550] border-[#1c3550] text-white font-bold"
            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
        }`}
      >
        <span className="truncate">{display}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-30 top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg overflow-hidden"
          style={{ minWidth }}
        >
          <ul className="max-h-64 overflow-y-auto py-1">
            {options.map((opt, idx) => {
              const checked = values.includes(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    ref={idx === 0 ? firstItemRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(opt.value)}
                    className="w-full text-left px-2.5 py-1.5 text-[12px] hover:bg-gray-50 flex items-center gap-2 focus:outline-none focus:bg-gray-50"
                  >
                    <span
                      className={`flex-shrink-0 inline-flex items-center justify-center w-3.5 h-3.5 rounded border transition-colors ${
                        checked
                          ? "bg-[#1c3550] border-[#1c3550] text-white"
                          : "bg-white border-gray-300"
                      }`}
                      aria-hidden
                    >
                      {checked && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="truncate text-[10px] text-gray-400">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {hasSelection && (
            <div className="border-t border-gray-100 px-2 py-1">
              <button
                type="button"
                onClick={clear}
                className="text-[10px] text-gray-500 hover:text-[#1c3550]"
              >
                クリア
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
