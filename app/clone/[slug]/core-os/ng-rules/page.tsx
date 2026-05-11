// /clone/[slug]/core-os/ng-rules ─ NG判断・確認ルールの一覧 + 追加。
// AI Clone が触らない領域 = 安全装置。

import { ShieldAlert } from "lucide-react";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { CoreOsNav } from "../_components/CoreOsNav";
import { NgRuleAddDialog } from "./_components/NgRuleAddDialog";

export const dynamic = "force-dynamic";

interface NgRuleRow {
  id: string;
  area_name: string;
  area: string | null;
  reason_not_for_ai: string | null;
  escalation_target: string | null;
  confirmation_procedure: string | null;
}

export default async function NgRulesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_ng_rule")
    .select(
      "id, area_name, area, reason_not_for_ai, escalation_target, confirmation_procedure",
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  const rules = (data ?? []) as NgRuleRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="CORE OS / 06"
        title="NG判断・確認ルール"
        description="AI Clone が触らない領域。判断ミスや信頼毀損のリスクが高いものは必ず本人にエスカレする。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={rules.length} label="領域" tone="navy" />
            <NgRuleAddDialog slug={slug} tenantId={tenant.id} />
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

      {!error && rules.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ NG領域が登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            「100万円超の見積」「税務判断」「クレーム対応」など、AIに任せない領域を言語化していきます。
          </p>
        </EditorialCard>
      )}

      {!error && rules.length > 0 && (
        <ul className="space-y-3">
          {rules.map((r) => (
            <li key={r.id}>
              <EditorialCard variant="row" className="px-5 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#f3e9e6] flex-shrink-0 mt-0.5"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#8a4538]" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#1c3550] mb-0.5">
                      {r.area_name}
                    </h3>
                    {r.area && (
                      <span className="text-[11px] tracking-[0.15em] text-gray-500 uppercase">
                        {r.area}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-[12px] pl-10">
                  {r.reason_not_for_ai && (
                    <div>
                      <span className="text-gray-400 tracking-wider">理由: </span>
                      <span className="text-gray-700 whitespace-pre-wrap">
                        {r.reason_not_for_ai}
                      </span>
                    </div>
                  )}
                  {r.escalation_target && (
                    <div>
                      <span className="text-gray-400 tracking-wider">エスカレ先: </span>
                      <span className="text-gray-700">{r.escalation_target}</span>
                    </div>
                  )}
                  {r.confirmation_procedure && (
                    <div>
                      <span className="text-gray-400 tracking-wider">確認手順: </span>
                      <span className="text-gray-700 whitespace-pre-wrap">
                        {r.confirmation_procedure}
                      </span>
                    </div>
                  )}
                </div>
              </EditorialCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
