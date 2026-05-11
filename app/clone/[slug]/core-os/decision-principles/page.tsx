// /clone/[slug]/core-os/decision-principles ─ 判断基準の一覧 + 追加。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { CoreOsNav } from "../_components/CoreOsNav";
import { DecisionPrincipleAddDialog } from "./_components/DecisionPrincipleAddDialog";

export const dynamic = "force-dynamic";

interface PrincipleRow {
  id: string;
  name: string;
  category: string | null;
  rule: string | null;
  reason: string | null;
  priority: string | null;
  exception: string | null;
  related_values: string[] | null;
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    高: { bg: "bg-[#f3e9e6]", border: "border-[#d8c4be]", text: "text-[#8a4538]" },
    中: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]" },
    低: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500" },
  };
  const s = styles[priority] ?? styles["低"];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${s.bg} ${s.border} ${s.text}`}
    >
      優先 {priority}
    </span>
  );
}

export default async function DecisionPrinciplesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_decision_principle")
    .select(
      "id, name, category, rule, reason, priority, exception, related_values",
    )
    .eq("tenant_id", tenant.id)
    .order("priority", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const principles = (data ?? []) as PrincipleRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="CORE OS / 04"
        title="判断基準"
        description="AI Clone が「あなたっぽく」判断するための核。「○○のときは△△する」というルールを言語化して蓄積する。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={principles.length} label="ルール" tone="navy" />
            <DecisionPrincipleAddDialog slug={slug} tenantId={tenant.id} />
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

      {!error && principles.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ判断基準がありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            「単発仕事は引き受けない」「30分以内に返信する」など、判断のクセを言語化していきます。
          </p>
        </EditorialCard>
      )}

      {!error && principles.length > 0 && (
        <ul className="space-y-3">
          {principles.map((p) => (
            <li key={p.id}>
              <EditorialCard variant="row" className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#1c3550] mb-1">
                      {p.name}
                    </h3>
                    {p.category && (
                      <span className="text-[11px] tracking-[0.15em] text-gray-500 uppercase">
                        {p.category}
                      </span>
                    )}
                  </div>
                  <PriorityBadge priority={p.priority} />
                </div>

                {p.rule && (
                  <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap mt-2">
                    {p.rule}
                  </p>
                )}

                <div className="space-y-1.5 mt-3 text-[12px]">
                  {p.reason && (
                    <div>
                      <span className="text-gray-400 tracking-wider">理由: </span>
                      <span className="text-gray-700 whitespace-pre-wrap">
                        {p.reason}
                      </span>
                    </div>
                  )}
                  {p.exception && (
                    <div>
                      <span className="text-gray-400 tracking-wider">例外: </span>
                      <span className="text-gray-700 whitespace-pre-wrap">
                        {p.exception}
                      </span>
                    </div>
                  )}
                </div>

                {p.related_values && p.related_values.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                    {p.related_values.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-gray-500 bg-gray-50 border border-gray-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </EditorialCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
