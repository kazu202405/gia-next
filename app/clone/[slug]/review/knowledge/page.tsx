// /clone/[slug]/review/knowledge ─ ナレッジ候補の一覧 + 追加。
// 確認状態（未確認/確認中/反映済/却下）を一覧上で直接切替可能。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ReviewNav } from "../_components/ReviewNav";
import { KnowledgeCandidateAddDialog } from "./_components/KnowledgeCandidateAddDialog";
import { KnowledgeStatusSelect } from "./_components/KnowledgeStatusSelect";

export const dynamic = "force-dynamic";

interface KnowledgeRow {
  id: string;
  content: string;
  kind: string | null;
  target_db: string | null;
  priority: string | null;
  origin_log: string | null;
  review_status: string | null;
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
      {priority}
    </span>
  );
}

export default async function KnowledgeCandidatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_knowledge_candidate")
    .select(
      "id, content, kind, target_db, priority, origin_log, review_status",
    )
    .eq("tenant_id", tenant.id)
    .order("review_status", { ascending: true })
    .order("created_at", { ascending: false });

  const candidates = (data ?? []) as KnowledgeRow[];
  const unreviewedCount = candidates.filter(
    (c) => c.review_status === "未確認",
  ).length;

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="REVIEW / 20"
        title="ナレッジ候補"
        description="「これは type 化できる」「FAQ にしたい」と感じた知見の draft 置き場。確認 → Core OS / FAQ への昇格判断。"
        right={
          <div className="flex items-center gap-2">
            {unreviewedCount > 0 && (
              <MetricChip count={unreviewedCount} label="未確認" tone="gold" />
            )}
            <MetricChip count={candidates.length} label="候補" tone="navy" />
            <KnowledgeCandidateAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      <ReviewNav slug={slug} />

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && candidates.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ候補がありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            会話・判断・案件の中で「これは型化できる」と感じた知見を、まず draft として置いていきます。
            <br />
            確認 → Core OS / FAQ に昇格させていきます。
          </p>
        </EditorialCard>
      )}

      {!error && candidates.length > 0 && (
        <ul className="space-y-3">
          {candidates.map((c) => {
            const dimmed =
              c.review_status === "却下" || c.review_status === "反映済";
            return (
              <li key={c.id}>
                <EditorialCard
                  variant="row"
                  className={`px-5 py-4 ${dimmed ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1c3550] leading-relaxed whitespace-pre-wrap">
                        {c.content}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        {c.kind && (
                          <span className="text-[11px] tracking-[0.15em] text-gray-500 uppercase">
                            {c.kind}
                          </span>
                        )}
                        {c.target_db && (
                          <span className="text-[11px] text-gray-500">
                            → {c.target_db}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={c.priority} />
                      <KnowledgeStatusSelect
                        slug={slug}
                        tenantId={tenant.id}
                        candidateId={c.id}
                        status={c.review_status ?? "未確認"}
                      />
                    </div>
                  </div>

                  {c.origin_log && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500 whitespace-pre-wrap">
                      <span className="text-gray-400 tracking-wider">元: </span>
                      {c.origin_log}
                    </div>
                  )}
                </EditorialCard>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
