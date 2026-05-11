// /clone/[slug]/finance/revenue ─ 売上の一覧 + 追加 + 当月サマリ。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDate } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { FinanceNav } from "../_components/FinanceNav";
import { RevenueAddDialog } from "./_components/RevenueAddDialog";
import { RevenueEditDialog } from "./_components/RevenueEditDialog";
import { RevenueDeleteButton } from "./_components/RevenueDeleteButton";

export const dynamic = "force-dynamic";

interface RevenueRow {
  id: string;
  occurred_date: string;
  customer: string | null;
  amount: number;
  expected_paid_date: string | null;
  payment_status: string | null;
  memo: string | null;
}

function PaymentBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<string, { bg: string; border: string; text: string; dotBg: string }> = {
    未入金: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", dotBg: "bg-gray-400" },
    一部入金: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]", dotBg: "bg-[#c08a3e]" },
    入金済: { bg: "bg-[#e9efe9]", border: "border-[#c5d3c8]", text: "text-[#3d6651]", dotBg: "bg-[#3d6651]" },
  };
  const s = styles[status] ?? styles["未入金"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotBg}`} />
      {status}
    </span>
  );
}

function formatYen(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function thisMonthSum(rows: RevenueRow[]): { total: number; unpaid: number } {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const inMonth = rows.filter((r) => r.occurred_date.startsWith(ym));
  const total = inMonth.reduce((acc, r) => acc + (r.amount ?? 0), 0);
  const unpaid = inMonth
    .filter((r) => r.payment_status !== "入金済")
    .reduce((acc, r) => acc + (r.amount ?? 0), 0);
  return { total, unpaid };
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
      <p className={`font-serif text-xl font-bold tabular-nums ${valueColor}`}>
        {value}
      </p>
    </div>
  );
}

export default async function RevenuePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_revenue")
    .select(
      "id, occurred_date, customer, amount, expected_paid_date, payment_status, memo",
    )
    .eq("tenant_id", tenant.id)
    .order("occurred_date", { ascending: false });

  const rows = (data ?? []) as RevenueRow[];
  const { total, unpaid } = thisMonthSum(rows);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="FINANCE / 18"
        title="売上"
        description="売上の記録と入金状況。AI Clone が KPI 進捗・入金催促タイミングを判断する基盤。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={rows.length} label="件" tone="navy" />
            <RevenueAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <FinanceNav slug={slug} />

      <div className="grid grid-cols-2 gap-3">
        <MetricBlock label="今月の売上" value={formatYen(total)} tone="navy" />
        <MetricBlock label="今月の未入金" value={formatYen(unpaid)} tone="gold" />
      </div>

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && rows.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ売上が記録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「売上を追加」から、入金予定・入金状態と一緒に記録していきます。
          </p>
        </EditorialCard>
      )}

      {!error && rows.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[0.8fr_1.4fr_0.9fr_0.7fr_0.9fr_1.3fr_0.4fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60 text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            <span>日付</span>
            <span>顧客</span>
            <span className="text-right">金額</span>
            <span>入金</span>
            <span className="text-right">入金予定</span>
            <span>備考</span>
            <span></span>
          </div>

          <ul className="divide-y divide-gray-100">
            {rows.map((r) => {
              const initial = {
                occurred_date: r.occurred_date,
                customer: r.customer ?? "",
                amount: String(r.amount),
                expected_paid_date: r.expected_paid_date ?? "",
                payment_status: r.payment_status ?? "",
                memo: r.memo ?? "",
              };
              const label =
                r.customer ||
                r.memo?.slice(0, 30) ||
                formatDate(r.occurred_date);
              return (
                <li
                  key={r.id}
                  className="md:grid md:grid-cols-[0.8fr_1.4fr_0.9fr_0.7fr_0.9fr_1.3fr_0.4fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group"
                >
                  <div className="text-[12px] text-gray-700 tabular-nums">
                    {formatDate(r.occurred_date)}
                  </div>
                  <div className="text-[13px] text-gray-700 mt-1 md:mt-0">
                    {r.customer || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="text-[13px] text-gray-800 mt-1 md:mt-0 md:text-right tabular-nums font-bold">
                    {formatYen(r.amount)}
                  </div>
                  <div className="mt-1 md:mt-0">
                    <PaymentBadge status={r.payment_status} />
                  </div>
                  <div className="text-[12px] text-gray-500 mt-1 md:mt-0 md:text-right tabular-nums">
                    {r.expected_paid_date
                      ? formatDate(r.expected_paid_date)
                      : "—"}
                  </div>
                  <div className="text-[12px] text-gray-500 mt-1 md:mt-0 truncate">
                    {r.memo || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="flex items-center justify-end gap-0.5 mt-1 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <RevenueEditDialog
                      slug={slug}
                      tenantId={tenant.id}
                      revenueId={r.id}
                      initial={initial}
                    />
                    <RevenueDeleteButton
                      slug={slug}
                      tenantId={tenant.id}
                      revenueId={r.id}
                      label={label}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
