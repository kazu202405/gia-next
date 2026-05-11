// /clone/[slug]/review/decisions ─ 判断履歴の一覧 + 追加。
// promote_to_core_os = true は「Core OS 昇格候補」バッジで強調。

import { Sparkles } from "lucide-react";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ReviewNav } from "../_components/ReviewNav";
import { DecisionLogAddDialog } from "./_components/DecisionLogAddDialog";

export const dynamic = "force-dynamic";

interface DecisionLogRow {
  id: string;
  occurred_at: string;
  theme: string | null;
  conclusion: string | null;
  reasoning: string | null;
  values_emphasized: string[] | null;
  reusable_rule: string | null;
  promote_to_core_os: boolean | null;
}

export default async function DecisionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_decision_log")
    .select(
      "id, occurred_at, theme, conclusion, reasoning, values_emphasized, reusable_rule, promote_to_core_os",
    )
    .eq("tenant_id", tenant.id)
    .order("occurred_at", { ascending: false });

  const logs = (data ?? []) as DecisionLogRow[];
  const promoteCount = logs.filter((l) => l.promote_to_core_os).length;

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="REVIEW / 19"
        title="判断履歴"
        description="その時どう判断したか・なぜそう判断したかの蓄積。AI Clone があなたの判断クセを学ぶ最重要データ。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={logs.length} label="判断" tone="navy" />
            {promoteCount > 0 && (
              <MetricChip count={promoteCount} label="昇格候補" tone="gold" />
            )}
            <DecisionLogAddDialog slug={slug} tenantId={tenant.id} />
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

      {!error && logs.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ判断履歴がありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            「これは記録に残しておきたい」と思う判断をした時に、テーマ・結論・理由を残していきます。
            <br />
            「次回も使える」と感じたものは Core OS（判断基準）に昇格できます。
          </p>
        </EditorialCard>
      )}

      {!error && logs.length > 0 && (
        <ul className="space-y-3">
          {logs.map((l) => (
            <li key={l.id}>
              <EditorialCard variant="row" className="px-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-gray-700 tabular-nums mb-1">
                      {formatDateTime(l.occurred_at)}
                    </div>
                    {l.theme && (
                      <h3 className="text-sm font-bold text-[#1c3550]">
                        {l.theme}
                      </h3>
                    )}
                  </div>
                  {l.promote_to_core_os && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fbf3e3] text-[#8a5a1c] border border-[#e6d3a3] flex-shrink-0">
                      <Sparkles className="w-2.5 h-2.5" />
                      Core OS 昇格候補
                    </span>
                  )}
                </div>

                {l.conclusion && (
                  <div className="mt-3">
                    <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                      結論
                    </span>
                    <p className="text-[13px] text-gray-800 leading-relaxed whitespace-pre-wrap mt-1">
                      {l.conclusion}
                    </p>
                  </div>
                )}

                {l.reasoning && (
                  <div className="mt-3">
                    <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                      理由
                    </span>
                    <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap mt-1">
                      {l.reasoning}
                    </p>
                  </div>
                )}

                {l.reusable_rule && (
                  <div className="mt-3 p-3 rounded-md bg-[#fbf3e3]/40 border border-[#e6d3a3]/60">
                    <span className="text-[10px] tracking-[0.2em] text-[#8a5a1c] uppercase">
                      次回使えるルール
                    </span>
                    <p className="text-[13px] text-[#5a3d12] leading-relaxed whitespace-pre-wrap mt-1">
                      {l.reusable_rule}
                    </p>
                  </div>
                )}

                {l.values_emphasized && l.values_emphasized.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                    {l.values_emphasized.map((t) => (
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
