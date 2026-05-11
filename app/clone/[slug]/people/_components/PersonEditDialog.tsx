"use client";

// /clone/[slug]/people/[id] の編集ダイアログ。
// PersonAddDialog の構成を踏襲し、初期値を受け取って updatePerson を呼ぶ。
// 共通フォーム化は将来のリファクタ課題（今は Add/Edit を別ファイルで持つ）。

import { useState, useTransition } from "react";
import { Pencil, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";
import { updatePerson, type PersonInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  personId: string;
  initial: PersonInput;
}

const IMPORTANCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "未設定" },
  { value: "S", label: "S（最重要）" },
  { value: "A", label: "A（重要）" },
  { value: "B", label: "B（通常）" },
  { value: "C", label: "C（参考）" },
];

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function PersonEditDialog({ slug, tenantId, personId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PersonInput>(initial);
  const [error, setError] = useState<string | null>(null);
  // 任意項目に既存値があれば最初から開いておく
  const hasOptionalValues = Boolean(
    initial.temperature ||
      initial.referred_by ||
      initial.challenges ||
      initial.caveats,
  );
  const [showOptional, setShowOptional] = useState(hasOptionalValues);
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
    setForm(initial);
    setError(null);
    setShowOptional(hasOptionalValues);
  };

  const change = <K extends keyof PersonInput>(
    key: K,
    value: PersonInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updatePerson(slug, tenantId, personId, form);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-colors"
      >
        <Pencil className="w-3 h-3" />
        編集
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="person-edit-title"
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6"
        >
          <button
            type="button"
            aria-label="閉じる"
            onClick={close}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-md shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  aria-hidden
                  className="inline-block w-1 h-5 bg-[#c08a3e] rounded-sm flex-shrink-0"
                />
                <h2
                  id="person-edit-title"
                  className="font-serif text-base font-semibold tracking-[0.06em] text-[#1c3550]"
                >
                  人物を編集
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                aria-label="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
                  名前 <span className="text-[#c0524a]">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="山田 太郎"
                  className={inputClass + " text-sm font-medium"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>会社</label>
                  <input
                    type="text"
                    value={form.company_name ?? ""}
                    onChange={(e) => change("company_name", e.target.value)}
                    placeholder="株式会社○○"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>役職</label>
                  <input
                    type="text"
                    value={form.position ?? ""}
                    onChange={(e) => change("position", e.target.value)}
                    placeholder="代表取締役"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>重要度</label>
                  <select
                    value={form.importance ?? ""}
                    onChange={(e) => change("importance", e.target.value)}
                    className={inputClass + " bg-white"}
                  >
                    {IMPORTANCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>関係性</label>
                  <input
                    type="text"
                    value={form.relationship ?? ""}
                    onChange={(e) => change("relationship", e.target.value)}
                    placeholder="既存顧客 / 元同僚"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>次のアクション</label>
                <input
                  type="text"
                  value={form.next_action ?? ""}
                  onChange={(e) => change("next_action", e.target.value)}
                  placeholder="来週ランチ打診"
                  className={inputClass}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowOptional((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-gray-800 transition-colors"
                >
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      showOptional ? "rotate-180" : ""
                    }`}
                  />
                  詳細項目
                </button>

                {showOptional && (
                  <div className="mt-3 space-y-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>温度感</label>
                        <input
                          type="text"
                          value={form.temperature ?? ""}
                          onChange={(e) => change("temperature", e.target.value)}
                          placeholder="熱い / 様子見"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>紹介元</label>
                        <input
                          type="text"
                          value={form.referred_by ?? ""}
                          onChange={(e) => change("referred_by", e.target.value)}
                          placeholder="○○さん経由"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>課題</label>
                      <textarea
                        value={form.challenges ?? ""}
                        onChange={(e) => change("challenges", e.target.value)}
                        rows={2}
                        placeholder="今抱えている課題"
                        className={inputClass + " resize-y"}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>注意点</label>
                      <textarea
                        value={form.caveats ?? ""}
                        onChange={(e) => change("caveats", e.target.value)}
                        rows={2}
                        placeholder="話す時の注意・地雷"
                        className={inputClass + " resize-y"}
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]"
                >
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="px-3 py-2 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={pending || form.name.trim().length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
