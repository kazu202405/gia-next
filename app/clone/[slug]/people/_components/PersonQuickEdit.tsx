"use client";

// 人物詳細ページの上部に置く「Quick Edit」パネル。
// 更新頻度の高い4項目（重要度・温度感・関係性・次のアクション）を
// モーダルを開かずに直接更新できるようにする。
//
// 挙動:
//   - 重要度: 5ボタン群（未/S/A/B/C）、クリック即保存
//   - 温度感・関係性・次のアクション: text input、blur or Enter で保存
//   - 保存中: フィールド右に小スピナー
//   - 成功: 緑 ✓ を 1.5 秒表示
//   - 失敗: フィールド下に赤メッセージ + 入力値を初期値に revert
//
// セキュリティ:
//   updatePersonField の whitelist で許可フィールドを4つに限定。
//   名前など重要カラムを inline から触れない作り。

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { updatePersonField, type QuickEditableField } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  personId: string;
  initial: {
    importance: string | null;
    temperature: string | null;
    relationship: string | null;
    next_action: string | null;
  };
}

// 重要度の選択肢。"" は「未設定」を表す。
const IMPORTANCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "未設定" },
  { value: "S", label: "S（最重要）" },
  { value: "A", label: "A（重要）" },
  { value: "B", label: "B（通常）" },
  { value: "C", label: "C（参考）" },
];

export function PersonQuickEdit({ slug, tenantId, personId, initial }: Props) {
  return (
    <section className="bg-white border border-gray-200 rounded-md px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex items-center gap-2 mb-3">
        <span aria-hidden className="inline-block w-1 h-4 bg-[#c08a3e] rounded-sm" />
        <h2 className="text-[10px] tracking-[0.25em] text-[#c08a3e] font-semibold">
          QUICK EDIT / 状態を更新
        </h2>
      </div>

      <div className="space-y-3">
        <ImportanceField
          slug={slug}
          tenantId={tenantId}
          personId={personId}
          initial={initial.importance ?? ""}
        />
        <InlineTextField
          slug={slug}
          tenantId={tenantId}
          personId={personId}
          field="temperature"
          label="温度感"
          initial={initial.temperature ?? ""}
          placeholder="熱い / 様子見 / 冷えてる"
        />
        <InlineTextField
          slug={slug}
          tenantId={tenantId}
          personId={personId}
          field="relationship"
          label="関係性"
          initial={initial.relationship ?? ""}
          placeholder="既存顧客 / 元同僚 / 紹介待ち"
        />
        <InlineTextField
          slug={slug}
          tenantId={tenantId}
          personId={personId}
          field="next_action"
          label="次のアクション"
          initial={initial.next_action ?? ""}
          placeholder="来週ランチ打診 / 提案書送付 / フォロー連絡"
        />
      </div>
    </section>
  );
}

// ── 重要度（select） ───────────────────────────────────
function ImportanceField({
  slug, tenantId, personId, initial,
}: { slug: string; tenantId: string; personId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setValue(initial); }, [initial]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const handleChange = (next: string) => {
    if (pending) return;
    if (next === value) return;
    const prev = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const res = await updatePersonField(slug, tenantId, personId, "importance", next);
      if (!res.ok) {
        setValue(prev);
        setError(res.error);
        return;
      }
      setJustSaved(true);
    });
  };

  return (
    <div className="grid grid-cols-[120px_1fr_auto] gap-3 items-start">
      <span className="text-[11px] tracking-[0.18em] text-gray-500 uppercase pt-2">重要度</span>
      <div className="flex flex-col gap-1">
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={pending}
          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm bg-white focus:border-[#1c3550] focus:outline-none disabled:bg-gray-50 disabled:cursor-wait hover:border-gray-300 transition-colors cursor-pointer"
        >
          {IMPORTANCE_OPTIONS.map((opt) => (
            <option key={opt.value || "_unset"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <div className="flex items-start gap-1 text-[11px] text-[#8a4538]">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
      <div className="pt-2">
        <StatusIndicator pending={pending} justSaved={justSaved} error={error} />
      </div>
    </div>
  );
}

// ── テキスト1行（温度感・関係性・次のアクション） ─────────
function InlineTextField({
  slug, tenantId, personId, field, label, initial, placeholder,
}: {
  slug: string;
  tenantId: string;
  personId: string;
  field: Exclude<QuickEditableField, "importance">;
  label: string;
  initial: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initial);
  const [savedValue, setSavedValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(initial);
    setSavedValue(initial);
  }, [initial]);

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const save = () => {
    if (pending) return;
    const trimmed = value.trim();
    // 変更なしなら何もしない
    if (trimmed === savedValue.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await updatePersonField(slug, tenantId, personId, field, trimmed);
      if (!res.ok) {
        setError(res.error);
        // 失敗時は元の値に revert
        setValue(savedValue);
        return;
      }
      setSavedValue(trimmed);
      setJustSaved(true);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur(); // blur がトリガーで save が走る
    } else if (e.key === "Escape") {
      e.preventDefault();
      setValue(savedValue);
      setError(null);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="grid grid-cols-[120px_1fr_auto] gap-3 items-start">
      <span className="text-[11px] tracking-[0.18em] text-gray-500 uppercase pt-2">{label}</span>
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={pending}
          className="w-full border border-gray-200 rounded px-2.5 py-1.5 text-sm bg-white focus:border-[#1c3550] focus:outline-none disabled:bg-gray-50 disabled:cursor-wait hover:border-gray-300 transition-colors"
        />
        {error && (
          <div className="flex items-start gap-1 text-[11px] text-[#8a4538]">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
      <div className="pt-2">
        <StatusIndicator pending={pending} justSaved={justSaved} error={error} />
      </div>
    </div>
  );
}

// 各フィールド共通のステータスインジケーター（spinner / ✓ / 何もなし）
function StatusIndicator({
  pending, justSaved, error,
}: { pending: boolean; justSaved: boolean; error: string | null }) {
  if (pending) {
    return <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />;
  }
  if (justSaved && !error) {
    return <Check className="w-3.5 h-3.5 text-[#3d6651]" />;
  }
  return <span className="inline-block w-3.5 h-3.5" aria-hidden />;
}
