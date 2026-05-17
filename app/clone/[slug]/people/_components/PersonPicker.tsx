"use client";

// 同テナント内の人物を検索 → 選択するピッカー。
// 紹介元（referred_by_person_id）等の人物 FK を埋めるための共通 UI。
//
// 挙動:
//   - 未選択時: 検索入力ボックスのみ表示
//   - 入力で 250ms debounce 検索
//   - 結果から選択 → pill 表示に切替（[名前 ×]）
//   - × クリックで未選択に戻す
//   - excludeId（自分自身など）は候補から除外

import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, CheckCircle2 } from "lucide-react";
import {
  searchPeopleInTenant,
  type PersonPickerHit,
} from "../_actions";

interface Props {
  tenantId: string;
  /** 候補から除外する人物 ID（自分自身を選べないように） */
  excludeId?: string;
  /** 初期表示の選択済み人物。FK 値とラベル両方ある形。 */
  initialSelected: PersonPickerHit | null;
  /** 選択が変わったとき呼ばれる（null = 未選択へ） */
  onChange: (selected: PersonPickerHit | null) => void;
  placeholder?: string;
}

export function PersonPicker({
  tenantId, excludeId, initialSelected, onChange, placeholder,
}: Props) {
  const [selected, setSelected] = useState<PersonPickerHit | null>(initialSelected);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PersonPickerHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 外側クリックで結果ドロップダウンを閉じる
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // クエリ変更で検索（debounce）
  useEffect(() => {
    if (selected) return; // 選択中は検索しない
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchPeopleInTenant(tenantId, query, excludeId);
      if (res.ok) {
        setHits(res.hits);
        setError(null);
      } else {
        setHits([]);
        setError(res.error);
      }
      setSearching(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tenantId, excludeId, selected]);

  const pick = (hit: PersonPickerHit) => {
    setSelected(hit);
    setOpen(false);
    setQuery("");
    onChange(hit);
  };

  const clear = () => {
    setSelected(null);
    setQuery("");
    onChange(null);
  };

  if (selected) {
    return (
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1c3550]/5 border border-[#1c3550]/20 rounded text-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#1c3550]" />
          <span className="font-semibold text-[#1c3550]">{selected.name}</span>
          {selected.companyName && (
            <span className="text-[12px] text-gray-500">／{selected.companyName}</span>
          )}
          <button
            type="button"
            onClick={clear}
            aria-label="選択をクリア"
            className="ml-1 p-0.5 rounded hover:bg-[#1c3550]/10 text-gray-500 hover:text-[#1c3550]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "名前で検索"}
          className="w-full border border-gray-200 rounded pl-8 pr-2.5 py-1.5 text-sm bg-white focus:border-[#1c3550] focus:outline-none hover:border-gray-300 transition-colors"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto">
          {hits.length === 0 && !searching && (
            <div className="px-3 py-3 text-[12px] text-gray-500 text-center">
              {query.trim().length === 0 ? "候補なし" : "該当なし"}
            </div>
          )}
          {hits.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => pick(h)}
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1c3550]">{h.name}</span>
                      {h.companyName && (
                        <span className="text-gray-500 text-[12px]">／{h.companyName}</span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <div className="px-3 py-2 text-[11px] text-[#8a4538] border-t border-gray-100">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
