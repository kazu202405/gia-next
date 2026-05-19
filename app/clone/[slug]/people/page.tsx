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
import { SortableTableHeader } from "@/components/nav/SortableTableHeader";
import { PersonAddDialog } from "./_components/PersonAddDialog";
import { PeopleFilterBar } from "./_components/PeopleFilterBar";

export const dynamic = "force-dynamic";

interface PersonRow {
  id: string;
  name: string;
  company_name: string | null;
  position: string | null;
  importance: string | null;
  temperature: string | null;
  // 2026-05-17 migration 0028: relationship → met_context
  met_context: string | null;
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

function parseCsvParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw[0] : raw;
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

function sanitizeForOr(s: string): string {
  return s.replace(/[,()]/g, "").trim();
}

export default async function PeoplePage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = sanitizeForOr((sp.q ?? "").toString());
  const importances = parseCsvParam(sp.importance);
  const temperatures = parseCsvParam(sp.temperature);
  const metContexts = parseCsvParam(sp.met_context);
  const hasAction = sp.has_action === "1";
  // 既定は更新日新しい順
  const sort = (sp.sort ?? "updated_at_desc").toString();

  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  // メインクエリ：条件を順次積む
  let mainQuery = supabase
    .from("ai_clone_person")
    .select(
      "id, name, company_name, position, importance, temperature, met_context, next_action, updated_at",
    )
    .eq("tenant_id", tenant.id);

  if (importances.length > 0) mainQuery = mainQuery.in("importance", importances);
  if (temperatures.length > 0) mainQuery = mainQuery.in("temperature", temperatures);
  if (metContexts.length > 0) mainQuery = mainQuery.in("met_context", metContexts);
  if (hasAction) mainQuery = mainQuery.not("next_action", "is", null);
  if (q) {
    mainQuery = mainQuery.or(
      `name.ilike.%${q}%,company_name.ilike.%${q}%,position.ilike.%${q}%`,
    );
  }

  // ソート（SortableTableHeader と連動）
  // 有効 field：name / updated_at / importance
  const [sortField, sortDir] = sort.split("_").length === 3
    ? [sort.split("_").slice(0, 2).join("_"), sort.split("_")[2]] as [string, "asc" | "desc"]
    : [sort.split("_")[0], sort.split("_")[1]] as [string, "asc" | "desc"];
  const ascending = sortDir === "asc";
  if (sortField === "name" || sortField === "updated_at" || sortField === "importance") {
    mainQuery = mainQuery.order(sortField, { ascending, nullsFirst: false });
  } else {
    mainQuery = mainQuery.order("updated_at", { ascending: false });
  }

  // total（フィルタなしでカウント）と met_context ユニーク値を並列取得
  const [logsRes, totalRes, metContextRes] = await Promise.all([
    mainQuery,
    supabase
      .from("ai_clone_person")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
    // met_context のユニーク値（重複あり、後で集計）
    supabase
      .from("ai_clone_person")
      .select("met_context")
      .eq("tenant_id", tenant.id)
      .not("met_context", "is", null),
  ]);
  const { data, error } = logsRes;
  const totalCount = totalRes.count ?? 0;
  const hasActiveFilter =
    q.length > 0 || importances.length > 0 || temperatures.length > 0
    || metContexts.length > 0 || hasAction;

  // met_context の使用回数集計（typeahead 候補表示用）
  const metContextCounts = new Map<string, number>();
  for (const r of (metContextRes.data ?? []) as { met_context: string | null }[]) {
    const v = r.met_context?.trim();
    if (!v) continue;
    metContextCounts.set(v, (metContextCounts.get(v) ?? 0) + 1);
  }
  const metContextOptions = Array.from(metContextCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const people = (data ?? []) as PersonRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="HUB / PEOPLE"
        title="人物"
        description="人脈・顧客・パートナーをここに集約。AI Clone が紹介設計や商談前準備で参照する基盤データ。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={totalCount} label="登録済み" tone="navy" />
            <PersonAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      {totalCount > 0 && (
        <PeopleFilterBar
          filteredCount={people.length}
          totalCount={totalCount}
          metContextOptions={metContextOptions}
        />
      )}

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && people.length === 0 && !hasActiveFilter && (
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

      {!error && people.length === 0 && hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            条件に一致する人物はいません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            検索キーワードやフィルタを見直してみてください。
            <br />
            上部「フィルタ解除」で全件表示に戻せます。
          </p>
        </EditorialCard>
      )}

      {!error && people.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          {/* テーブルヘッダー（クリックで並び替え） */}
          <div className="hidden md:grid md:grid-cols-[1.5fr_1.5fr_0.6fr_0.7fr_1fr_1.2fr_0.9fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60">
            <SortableTableHeader field="name" defaultDir="asc" label="名前" />
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">会社 / 役職</span>
            <SortableTableHeader field="importance" defaultDir="asc" label="重要度" />
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">温度感</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">出会った場所</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase">次のアクション</span>
            <SortableTableHeader field="updated_at" defaultDir="desc" label="更新" align="right" />
          </div>

          {/* 行（クリックで詳細へ） */}
          <ul className="divide-y divide-gray-100">
            {people.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/clone/${slug}/people/${p.id}`}
                  className="md:grid md:grid-cols-[1.5fr_1.5fr_0.6fr_0.7fr_1fr_1.2fr_0.9fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors block"
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

                  {/* 重要度 */}
                  <div className="mt-1 md:mt-0">
                    <ImportanceBadge importance={p.importance} />
                  </div>

                  {/* 温度感 */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0">
                    {p.temperature || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 出会った場所 */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0">
                    {p.met_context || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* 次のアクション */}
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 truncate">
                    {p.next_action || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

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
