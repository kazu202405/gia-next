"use client";

// 3年計画編集フォーム。設定画面型。plan_name のみ必須。

import { useState, useTransition } from "react";
import { Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { saveThreeYearPlan, type ThreeYearPlanInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  existingId: string | null;
  initial: ThreeYearPlanInput;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10";

export function ThreeYearPlanForm({
  slug,
  tenantId,
  existingId,
  initial,
}: Props) {
  const [form, setForm] = useState<ThreeYearPlanInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [pending, startTransition] = useTransition();

  const change = <K extends keyof ThreeYearPlanInput>(
    key: K,
    value: ThreeYearPlanInput[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
    if (savedAt) setSavedAt(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveThreeYearPlan(slug, tenantId, existingId, form);
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
        <label className="block text-xs font-bold text-gray-700 tracking-wider mb-1.5">
          計画名 <span className="text-[#c0524a]">*</span>
        </label>
        <input
          type="text"
          required
          value={form.plan_name}
          onChange={(e) => change("plan_name", e.target.value)}
          placeholder="2026-2028 中期計画"
          className={inputClass + " text-sm font-medium"}
        />
      </div>

      <div>
        <label className={labelClass}>3年後の理想状態</label>
        <textarea
          value={form.ideal_state_in_3y ?? ""}
          onChange={(e) => change("ideal_state_in_3y", e.target.value)}
          rows={4}
          placeholder="3年後、どんな状態になっていたいか（売上・顧客・働き方・自分自身）"
          className={inputClass + " resize-y"}
        />
      </div>

      <div>
        <label className={labelClass}>
          事業の柱
          <span className="ml-2 font-normal text-gray-400">
            カンマ・スラッシュ・改行で区切る
          </span>
        </label>
        <input
          type="text"
          value={form.business_pillars ?? ""}
          onChange={(e) => change("business_pillars", e.target.value)}
          placeholder="AI Clone, サロン, 受託開発"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>収益モデル</label>
        <textarea
          value={form.revenue_model ?? ""}
          onChange={(e) => change("revenue_model", e.target.value)}
          rows={3}
          placeholder="MRR比率/フロー比率、単発と継続の構成、誰から何で稼ぐか"
          className={inputClass + " resize-y"}
        />
      </div>

      <div>
        <label className={labelClass}>作りたい資産</label>
        <textarea
          value={form.assets_to_build ?? ""}
          onChange={(e) => change("assets_to_build", e.target.value)}
          rows={3}
          placeholder="3年後に残っていてほしい資産（人脈・コンテンツ・プロダクト・チーム）"
          className={inputClass + " resize-y"}
        />
      </div>

      <div>
        <label className={labelClass}>やめたい働き方</label>
        <textarea
          value={form.work_style_to_quit ?? ""}
          onChange={(e) => change("work_style_to_quit", e.target.value)}
          rows={3}
          placeholder="3年後にはやっていないと決めること（自分の時間の使い方）"
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
          disabled={pending || form.plan_name.trim().length === 0}
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
