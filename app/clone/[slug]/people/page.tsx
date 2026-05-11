// /clone/[slug]/people ─ Hub / 人物の一覧 + 追加。
// loadTenantOr404 でテナント解決 → ai_clone_person を tenant 内で SELECT し、
// テーブル形式で表示。追加は PersonAddDialog（モーダル）から Server Action 経由。
// 編集 / 削除 / 詳細ページは Phase 1 残作業。

import Link from "next/link";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { PersonAddDialog } from "./_components/PersonAddDialog";

export const dynamic = "force-dynamic";

interface PersonRow {
  id: string;
  name: string;
  company_name: string | null;
  position: string | null;
  importance: string | null;
  relationship: string | null;
  next_action: string | null;
  updated_at: string | null;
}

// 重要度バッジ（S/A/B/C を muted Editorial パレットで）
function ImportanceBadge({ importance }: { importance: string | null }) {
  if (!importance) {
    return <span className="text-[11px] text-gray-300">—</span>;
  }
  const styles: Record<
    string,
    { bg: string; border: string; text: string; dotBg: string }
  > = {
    S: {
      bg: "bg-[#fbf3e3]",
      border: "border-[#e6d3a3]",
      text: "text-[#8a5a1c]",
      dotBg: "bg-[#c08a3e]",
    },
    A: {
      bg: "bg-[#f1f4f7]",
      border: "border-[#d6dde5]",
      text: "text-[#1c3550]",
      dotBg: "bg-[#1c3550]",
    },
    B: {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-600",
      dotBg: "bg-gray-400",
    },
    C: {
      bg: "bg-gray-50",
      border: "border-gray-100",
      text: "text-gray-400",
      dotBg: "bg-gray-300",
    },
  };
  const s = styles[importance] ?? styles.B;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotBg}`} />
      {importance}
    </span>
  );
}

export default async function PeoplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_person")
    .select(
      "id, name, company_name, position, importance, relationship, next_action, updated_at",
    )
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false });

  const people = (data ?? []) as PersonRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="HUB / PEOPLE"
        title="人物"
        description="人脈・顧客・パートナーをここに集約。AI Clone が紹介設計や商談前準備で参照する基盤データ。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={people.length} label="登録済み" tone="navy" />
            <PersonAddDialog slug={slug} tenantId={tenant.id} />
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

      {!error && people.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ誰も登録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「人物を追加」から、AI Clone に覚えさせたい人を1人ずつ入れていきます。
            <br />
            名前だけでもOK。詳細は後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!error && people.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          {/* テーブルヘッダー */}
          <div className="hidden md:grid md:grid-cols-[1.5fr_1.5fr_1fr_0.6fr_1fr_1.4fr_0.9fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60 text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            <span>名前</span>
            <span>会社 / 役職</span>
            <span>関係性</span>
            <span>重要度</span>
            <span>次のアクション</span>
            <span></span>
            <span className="text-right">更新</span>
          </div>

          {/* 行（クリックで詳細へ） */}
          <ul className="divide-y divide-gray-100">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/clone/${slug}/people/${p.id}`}
                  className="md:grid md:grid-cols-[1.5fr_1.5fr_1fr_0.6fr_1fr_1.4fr_0.9fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors block"
                >
                  {/* 名前 */}
                  <div className="font-medium text-sm text-[#1c3550]">
                    {p.name}
                  </div>

                  {/* 会社 / 役職 */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0">
                    {p.company_name || p.position ? (
                      <>
                        {p.company_name && <span>{p.company_name}</span>}
                        {p.company_name && p.position && (
                          <span className="text-gray-300 mx-1.5">/</span>
                        )}
                        {p.position && <span>{p.position}</span>}
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 関係性 */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0">
                    {p.relationship || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 重要度 */}
                  <div className="mt-1 md:mt-0">
                    <ImportanceBadge importance={p.importance} />
                  </div>

                  {/* 次のアクション */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 truncate">
                    {p.next_action || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* スペーサー（将来：行内アクション用） */}
                  <div />

                  {/* 更新日時 */}
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
