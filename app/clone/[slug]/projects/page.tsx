// /clone/[slug]/projects ─ Hub / 案件の一覧 + 追加。
// 詳細・編集・削除は Phase 1 残（people と同パターンで後追い実装可能）。

import Link from "next/link";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import {
  formatDate,
  formatDateTime,
} from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ProjectAddDialog } from "./_components/ProjectAddDialog";

export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  status: string | null;
  proposal_amount: number | null;
  contract_amount: number | null;
  next_action: string | null;
  due_date: string | null;
  updated_at: string | null;
}

// ステータスバッジ（muted Editorial パレット）
function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return <span className="text-[11px] text-gray-300">—</span>;
  }
  const styles: Record<
    string,
    { bg: string; border: string; text: string; dotBg: string }
  > = {
    リード: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-600",
      dotBg: "bg-gray-400",
    },
    提案: {
      bg: "bg-[#fbf3e3]",
      border: "border-[#e6d3a3]",
      text: "text-[#8a5a1c]",
      dotBg: "bg-[#c08a3e]",
    },
    受注: {
      bg: "bg-[#e9efe9]",
      border: "border-[#c5d3c8]",
      text: "text-[#3d6651]",
      dotBg: "bg-[#3d6651]",
    },
    進行中: {
      bg: "bg-[#f1f4f7]",
      border: "border-[#d6dde5]",
      text: "text-[#1c3550]",
      dotBg: "bg-[#1c3550]",
    },
    完了: {
      bg: "bg-[#eef0ee]",
      border: "border-[#cdd3cd]",
      text: "text-[#3a4a3d]",
      dotBg: "bg-[#3a4a3d]",
    },
    失注: {
      bg: "bg-[#f3e9e6]",
      border: "border-[#d8c4be]",
      text: "text-[#8a4538]",
      dotBg: "bg-[#8a4538]",
    },
  };
  const s = styles[status] ?? styles["リード"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotBg}`} />
      {status}
    </span>
  );
}

function formatYen(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return `¥${Math.round(value).toLocaleString("ja-JP")}`;
}

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_project")
    .select(
      "id, name, status, proposal_amount, contract_amount, next_action, due_date, updated_at",
    )
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false });

  const projects = (data ?? []) as ProjectRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="HUB / PROJECTS"
        title="案件"
        description="提案中・進行中・完了の案件をここに集約。AI Clone が金額・期限・次アクションから優先度を提案する基盤データ。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={projects.length} label="登録済み" tone="navy" />
            <ProjectAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && projects.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ案件が登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「案件を追加」から、進行中の案件を1件ずつ入れていきます。
            <br />
            案件名だけでもOK。金額・期限・次アクションは後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!error && projects.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.6fr_0.7fr_0.9fr_0.9fr_1.4fr_0.8fr_0.9fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60 text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            <span>案件名</span>
            <span>状態</span>
            <span className="text-right">提案</span>
            <span className="text-right">受注</span>
            <span>次のアクション</span>
            <span className="text-right">期限</span>
            <span className="text-right">更新</span>
          </div>

          <ul className="divide-y divide-gray-100">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/clone/${slug}/projects/${p.id}`}
                  className="md:grid md:grid-cols-[1.6fr_0.7fr_0.9fr_0.9fr_1.4fr_0.8fr_0.9fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors block"
                >
                  <div className="font-medium text-sm text-[#1c3550]">
                    {p.name}
                  </div>
                  <div className="mt-1 md:mt-0">
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 md:text-right tabular-nums">
                    {formatYen(p.proposal_amount)}
                  </div>
                  <div className="text-[13px] text-gray-800 mt-1 md:mt-0 md:text-right tabular-nums font-medium">
                    {formatYen(p.contract_amount)}
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 truncate">
                    {p.next_action || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="text-[12px] text-gray-500 mt-1 md:mt-0 md:text-right tabular-nums">
                    {p.due_date ? formatDate(p.due_date) : "—"}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 md:mt-0 md:text-right tabular-nums">
                    {formatDateTime(p.updated_at)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
