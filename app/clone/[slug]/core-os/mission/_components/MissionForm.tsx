"use client";

// ミッション編集フォーム。設定画面型（1テナント1行）。
// 保存ボタンは 1つだけ。autosave は付けず明示保存（重要な核データなので）。

import { useState, useTransition } from "react";
import { Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { saveMission, type MissionInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  existingId: string | null;
  initial: MissionInput;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function MissionForm({ slug, tenantId, existingId, initial }: Props) {
  const [form, setForm] = useState<MissionInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();

  const change = <K extends keyof MissionInput>(
    key: K,
    value: MissionInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
    if (savedAt) setSavedAt(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveMission(slug, tenantId, existingId, form);
      if (!res.ok) {
        setError(res.error ?? "保存に失敗しました");
        return;
      }
      setSavedAt(new Date());
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className={labelClass}>ミッション</label>
        <textarea
          value={form.mission ?? ""}
          onChange={(e) => change("mission", e.target.value)}
          rows={3}
          placeholder="あなたが何のために事業を続けるのか、一文で"
          className={inputClass + " resize-y"}
        />
      </div>

      <div>
        <label className={labelClass}>
          価値観
          <span className="ml-2 font-normal text-gray-400">
            カンマ・スラッシュ・改行で区切る
          </span>
        </label>
        <input
          type="text"
          value={form.values_tags ?? ""}
          onChange={(e) => change("values_tags", e.target.value)}
          placeholder="誠実, 長期, 関係性, 速度"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>目指す世界</label>
        <textarea
          value={form.target_world ?? ""}
          onChange={(e) => change("target_world", e.target.value)}
          rows={3}
          placeholder="この事業を通じて、世界がどう変わっていてほしいか"
          className={inputClass + " resize-y"}
        />
      </div>

      <div>
        <label className={labelClass}>やらないこと</label>
        <textarea
          value={form.not_doing ?? ""}
          onChange={(e) => change("not_doing", e.target.value)}
          rows={3}
          placeholder="一見いい話に見えても、自分の事業ではやらないと決めていること"
          className={inputClass + " resize-y"}
        />
      </div>

      <div>
        <label className={labelClass}>お客様に届けたい価値</label>
        <textarea
          value={form.value_to_customer ?? ""}
          onChange={(e) => change("value_to_customer", e.target.value)}
          rows={3}
          placeholder="他社ではなくあなたから受け取る、本質的な価値"
          className={inputClass + " resize-y"}
        />
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

      <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
        <div className="text-[11px] text-gray-500">
          {savedAt && !pending ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              保存しました（{savedAt.getHours()}:
              {String(savedAt.getMinutes()).padStart(2, "0")}）
            </span>
          ) : (
            <span className="text-gray-400">変更したら「保存」を押してください</span>
          )}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          保存する
        </button>
      </div>
    </form>
  );
}
