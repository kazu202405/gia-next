// /clone/[slug]/services ─ Hub / サービスの一覧 + 追加。
// 詳細・編集・削除は Phase 1 残（people と同パターンで後追い実装可能）。

import Link from "next/link";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ServiceAddDialog } from "./_components/ServiceAddDialog";

export const dynamic = "force-dynamic";

interface ServiceRow {
  id: string;
  name: string;
  target_audience: string | null;
  pricing: string | null;
  problem_solved: string | null;
  updated_at: string | null;
}

// 長文の最初の1行（または最大80字）だけ抜粋して一覧に出す。
function excerpt(value: string | null, max = 80): string | null {
  if (!value) return null;
  const firstLine = value.split(/\r?\n/)[0].trim();
  if (firstLine.length === 0) return null;
  return firstLine.length > max
    ? `${firstLine.slice(0, max)}…`
    : firstLine;
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_service")
    .select("id, name, target_audience, pricing, problem_solved, updated_at")
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false });

  const services = (data ?? []) as ServiceRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="HUB / SERVICES"
        title="サービス・商品"
        description="提供する商品のマスタ。AI Clone が提案文を組み立てる時の素材として参照する。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={services.length} label="登録済み" tone="navy" />
            <ServiceAddDialog slug={slug} tenantId={tenant.id} />
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

      {!error && services.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだサービスが登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「サービスを追加」から、提供している商品を1件ずつ入れていきます。
            <br />
            サービス名だけでもOK。詳細は後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!error && services.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.5fr_1.3fr_1fr_2fr_0.9fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60 text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            <span>サービス名</span>
            <span>対象者</span>
            <span>料金</span>
            <span>解決する悩み</span>
            <span className="text-right">更新</span>
          </div>

          <ul className="divide-y divide-gray-100">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/clone/${slug}/services/${s.id}`}
                  className="md:grid md:grid-cols-[1.5fr_1.3fr_1fr_2fr_0.9fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors block"
                >
                  <div className="font-medium text-sm text-[#1c3550]">
                    {s.name}
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0">
                    {s.target_audience || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="text-[13px] text-gray-700 mt-1 md:mt-0 tabular-nums">
                    {s.pricing || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 leading-relaxed">
                    {excerpt(s.problem_solved) || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1 md:mt-0 md:text-right tabular-nums">
                    {formatDateTime(s.updated_at)}
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
