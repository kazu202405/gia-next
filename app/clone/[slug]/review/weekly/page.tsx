// /clone/[slug]/review/weekly ─ 週次レビュー（Phase 2）。
// 現状はプレースホルダ。ReviewNav は配置済みなので判断履歴・ナレッジ候補へは横展開可能。

import {
  EditorialHeader,
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { ReviewNav } from "../_components/ReviewNav";

export const dynamic = "force-dynamic";

export default async function WeeklyReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await loadTenantOr404(slug);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="REVIEW / 22"
        title="週次レビュー"
        description="今週の重要判断・進んだ案件・止まっている案件・来週の優先タスク。AI Clone が自動生成 → 承認 のフロー（Phase 2）。"
      />

      <ReviewNav slug={slug} />

      <EditorialCard className="px-6 py-6">
        <p className="text-sm text-gray-700 leading-relaxed">
          このページは Phase 2 で実装予定です。今は枠だけ配置しています。
        </p>
        <ul className="mt-4 space-y-1.5 text-[13px] text-gray-600">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 inline-block w-1 h-1 rounded-full bg-[#c08a3e]" />
            <span>週次レビュー（重要判断 / 進んだ案件 / 止まっている案件 / 来週の優先タスク）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 inline-block w-1 h-1 rounded-full bg-[#c08a3e]" />
            <span>月次レビュー（売上・経費・利益率 / 上位人物・案件）</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 inline-block w-1 h-1 rounded-full bg-[#c08a3e]" />
            <span>AI Clone が自動生成 → クライアント承認のフロー</span>
          </li>
        </ul>
      </EditorialCard>
    </div>
  );
}
