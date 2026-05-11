// /clone/[slug] ─ AI Clone のテナント別ダッシュボード。
// 現状は「枠」のみ：セットアップ進捗と 3 領域の入口だけを出す。
// Phase 1 完成時に KPI 数字・今週の活動・直近の判断履歴 5件 を実データで埋める。

import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";

export const dynamic = "force-dynamic";

export default async function CloneDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant, role } = await loadTenantOr404(slug);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow={`AI CLONE / ${tenant.slug.toUpperCase()}`}
        title="ダッシュボード"
        description="右腕AI が今日の判断材料として読みに行く、あなたの脳の最新スナップショット。各セクションへの入口はここから。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={0} label="今週の活動" tone="navy" />
            <MetricChip count={0} label="直近の判断" tone="gold" />
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            Hub｜誰となに
          </h3>
          <p className="text-sm text-gray-600">人物 0 / 案件 0 / サービス 0</p>
          <p className="text-[11px] text-gray-400 mt-3">
            Phase 1 で CRUD 実装予定。
          </p>
        </EditorialCard>
        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            Memory｜日々の蓄積
          </h3>
          <p className="text-sm text-gray-600">会話 0 / 進捗 0 / 判断履歴 0</p>
          <p className="text-[11px] text-gray-400 mt-3">
            Phase 1 で CRUD 実装予定。
          </p>
        </EditorialCard>
        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            Core OS｜判断軸
          </h3>
          <p className="text-sm text-gray-600">
            ミッション / KPI / 判断基準 / 口調 / NG / FAQ
          </p>
          <p className="text-[11px] text-gray-400 mt-3">
            Phase 1 で編集 UI 実装予定。
          </p>
        </EditorialCard>
      </div>

      <EditorialCard className="p-6">
        <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-4">
          セットアップ進捗
        </h3>
        <ul className="text-sm text-gray-700 space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-[#3d6651]">✅</span>
            <span>
              Supabase スキーマ配置（migration{" "}
              <code className="font-mono text-[12px] text-[#1c3550]">
                0013_ai_clone_schema.sql
              </code>
              ）
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#3d6651]">✅</span>
            <span>
              テナント{" "}
              <code className="font-mono text-[12px] text-[#1c3550]">
                {tenant.slug}
              </code>
              （{tenant.name}）作成 ・ role:{" "}
              <span className="font-mono text-[12px]">{role}</span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#3d6651]">✅</span>
            <span>UI 枠（レイアウト + 左ナビ + ダッシュボード骨組み）配置</span>
          </li>
          <li className="flex items-start gap-2 text-gray-400">
            <span>⬜</span>
            <span>Hub CRUD UI（人物 / 案件 / サービス）</span>
          </li>
          <li className="flex items-start gap-2 text-gray-400">
            <span>⬜</span>
            <span>Memory CRUD UI（会話 / 進捗 / 人物メモ / 判断履歴）</span>
          </li>
          <li className="flex items-start gap-2 text-gray-400">
            <span>⬜</span>
            <span>
              Core OS 編集 UI（ミッション / 3年 / KPI / 判断基準 / 口調 / NG /
              FAQ）
            </span>
          </li>
        </ul>
      </EditorialCard>
    </div>
  );
}
