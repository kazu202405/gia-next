// /clone/[slug]/core-os/annual-kpi ─ 年度KPIの一覧 + 追加。年度ごと1行運用想定。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { CoreOsNav } from "../_components/CoreOsNav";
import { AnnualKpiAddDialog } from "./_components/AnnualKpiAddDialog";

export const dynamic = "force-dynamic";

interface KpiRow {
  id: string;
  fiscal_year: string;
  yearly_theme: string | null;
  revenue_target: number | null;
  mrr_target: number | null;
  meeting_target: number | null;
  post_target: number | null;
  seminar_target: number | null;
  deal_target: number | null;
}

function formatYen(v: number | null) {
  if (v === null || v === undefined) return "—";
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function formatNum(v: number | null) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("ja-JP");
}

function MetricBlock({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "navy" | "gold";
}) {
  const valueColor =
    tone === "navy"
      ? "text-[#1c3550]"
      : tone === "gold"
        ? "text-[#8a5a1c]"
        : "text-gray-800";
  return (
    <div className="px-4 py-3 border border-gray-200 rounded-md bg-white">
      <p className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-1">
        {label}
      </p>
      <p className={`font-serif text-lg font-bold tabular-nums ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

export default async function AnnualKpiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_annual_kpi")
    .select(
      "id, fiscal_year, yearly_theme, revenue_target, mrr_target, meeting_target, post_target, seminar_target, deal_target",
    )
    .eq("tenant_id", tenant.id)
    .order("fiscal_year", { ascending: false });

  const kpis = (data ?? []) as KpiRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="CORE OS / 03"
        title="今年のKPI"
        description="年度別の重点テーマと数値目標。AI Clone が提案優先度を判断する時の基準。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={kpis.length} label="年度" tone="navy" />
            <AnnualKpiAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <CoreOsNav slug={slug} />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && kpis.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ年度KPIが登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「年度KPIを追加」から、今年の重点テーマと数値目標を入れていきます。
          </p>
        </EditorialCard>
      )}

      {!error && kpis.length > 0 && (
        <div className="space-y-5">
          {kpis.map((k) => (
            <EditorialCard key={k.id} className="px-6 py-5">
              <div className="flex items-baseline gap-3 mb-4 pb-3 border-b border-gray-100">
                <span className="font-serif text-2xl font-bold text-[#1c3550] tabular-nums">
                  {k.fiscal_year}
                </span>
                <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                  Fiscal Year
                </span>
                {k.yearly_theme && (
                  <span className="ml-auto text-sm text-gray-700">
                    {k.yearly_theme}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricBlock
                  label="売上目標"
                  value={formatYen(k.revenue_target)}
                  tone="gold"
                />
                <MetricBlock
                  label="月額課金目標"
                  value={formatYen(k.mrr_target)}
                  tone="navy"
                />
                <MetricBlock
                  label="商談数"
                  value={formatNum(k.meeting_target)}
                />
                <MetricBlock
                  label="投稿数"
                  value={formatNum(k.post_target)}
                />
                <MetricBlock
                  label="セミナー数"
                  value={formatNum(k.seminar_target)}
                />
                <MetricBlock
                  label="導入件数"
                  value={formatNum(k.deal_target)}
                />
              </div>
            </EditorialCard>
          ))}
        </div>
      )}
    </div>
  );
}
