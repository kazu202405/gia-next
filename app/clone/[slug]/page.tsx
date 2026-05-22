// /clone/[slug] ─ AI Clone のテナント別ダッシュボード。
// 各テーブルから count + 要対応項目を集計し、「今この瞬間の状態」を1画面に。

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Flame,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDate, formatDateTime } from "@/app/admin/_components/EditorialFormat";

export const dynamic = "force-dynamic";

function formatYen(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

// 今月の YYYY-MM プレフィクス
function monthPrefix(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 今月の開始日と翌月開始日（YYYY-MM-DD）。created_at/occurred_at の範囲フィルタ用。
function monthRange(): { start: string; nextStart: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-indexed
  const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const ny = m === 11 ? y + 1 : y;
  const nm = m === 11 ? 0 : m + 1;
  const nextStart = `${ny}-${String(nm + 1).padStart(2, "0")}-01`;
  return { start, nextStart };
}

// 今日の YYYY-MM-DD（期限切れ判定の境界）
function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// n 日前の YYYY-MM-DD（ご無沙汰判定の境界）
function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// embedded リソース（to-one）から日付フィールドを取り出す。
// Supabase は to-one を object か単一要素配列で返すことがあるため両対応。
function nestedDate(
  nested: unknown,
  field: string,
): string | null {
  if (!nested) return null;
  const obj = Array.isArray(nested) ? nested[0] : nested;
  if (!obj || typeof obj !== "object") return null;
  const v = (obj as Record<string, unknown>)[field];
  return typeof v === "string" ? v : null;
}

interface RecentDecisionRow {
  id: string;
  occurred_at: string;
  theme: string | null;
  conclusion: string | null;
  promote_to_core_os: boolean | null;
}

interface RecentConversationRow {
  id: string;
  occurred_at: string;
  channel: string | null;
  summary: string | null;
  content: string | null;
}

interface RecentTaskRow {
  id: string;
  name: string;
  due_date: string | null;
  priority: string | null;
}

// KPI ブロック（数値強調）
function MetricBlock({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "navy" | "gold" | "alert";
}) {
  const valueColor =
    tone === "navy"
      ? "text-[#1c3550]"
      : tone === "gold"
        ? "text-[#8a5a1c]"
        : tone === "alert"
          ? "text-[#8a4538]"
          : "text-gray-800";

  const inner = (
    <div className="px-4 py-3 border border-gray-200 rounded-md bg-white hover:border-gray-300 transition-colors h-full">
      <p className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-1">
        {label}
      </p>
      <p className={`font-serif text-xl font-bold tabular-nums ${valueColor}`}>
        {value}
      </p>
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

// 件数だけのコンパクトな行
function CountRow({
  label,
  count,
  href,
}: {
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors group"
    >
      <span className="text-sm text-gray-700">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-serif text-base font-bold text-[#1c3550] tabular-nums">
          {count}
        </span>
        <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600 transition-colors" />
      </span>
    </Link>
  );
}

export default async function CloneDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant, role } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const tenantId = tenant.id;
  const today = todayISO();
  const ym = monthPrefix();
  const { start: monthStart, nextStart: monthNextStart } = monthRange();

  // ────────────────────────────────────────────
  // 並列で集計クエリを発行（Server Component の利点）
  // ────────────────────────────────────────────
  const countOpts = { count: "exact" as const, head: true };

  const [
    personCount,
    projectCount,
    serviceCount,
    conversationCount,
    personNoteCount,
    progressLogCount,
    activityLogCount,
    decisionLogCount,
    knowledgeCount,
    expenseCount,
    revenueCount,
    missionCount,
    threeYearPlanCount,
    annualKpiCount,
    principleCount,
    toneRuleCount,
    ngRuleCount,
    faqCount,
    overdueTaskCount,
    openTaskCount,
    promoteCandidateCount,
    unreviewedKnowledgeCount,
    needsFinalCheckFaqCount,
    pendingDecisionProgressCount,
    monthRevenueRows,
    monthExpenseRows,
    recentDecisions,
    recentConversations,
    nearestTasks,
    newPeopleCount,
    saPeopleRes,
    convPersonLinksAll,
    actPersonLinksAll,
  ] = await Promise.all([
    supabase.from("ai_clone_person").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_project").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_service").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_conversation_log").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_person_note").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_project_progress_log").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_activity_log").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_decision_log").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_knowledge_candidate").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_expense").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_revenue").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_mission").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_three_year_plan").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_annual_kpi").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_decision_principle").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_tone_rule").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_ng_rule").select("id", countOpts).eq("tenant_id", tenantId),
    supabase.from("ai_clone_faq").select("id", countOpts).eq("tenant_id", tenantId),
    // 期限切れ未完了タスク
    supabase
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .neq("status", "完了")
      .lt("due_date", today)
      .not("due_date", "is", null),
    // 未完了タスク（未着手 or 進行中）
    supabase
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["未着手", "進行中"]),
    // Core OS 昇格候補（判断履歴）
    supabase
      .from("ai_clone_decision_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("promote_to_core_os", true),
    // 未確認のナレッジ候補
    supabase
      .from("ai_clone_knowledge_candidate")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("review_status", "未確認"),
    // 要最終確認の FAQ
    supabase
      .from("ai_clone_faq")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("requires_final_check", true),
    // 判断待ちが入っている進捗ログ
    supabase
      .from("ai_clone_project_progress_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("needs_decision", "is", null),
    // 今月の売上行（合計を JS 側で計算）
    supabase
      .from("ai_clone_revenue")
      .select("amount, payment_status, occurred_date")
      .eq("tenant_id", tenantId)
      .gte("occurred_date", `${ym}-01`)
      .lte("occurred_date", `${ym}-31`),
    // 今月の経費行（合計を JS 側で計算）
    supabase
      .from("ai_clone_expense")
      .select("amount, occurred_date")
      .eq("tenant_id", tenantId)
      .gte("occurred_date", `${ym}-01`)
      .lte("occurred_date", `${ym}-31`),
    // 最近の判断（5件）
    supabase
      .from("ai_clone_decision_log")
      .select("id, occurred_at, theme, conclusion, promote_to_core_os")
      .eq("tenant_id", tenantId)
      .order("occurred_at", { ascending: false })
      .limit(5),
    // 最近の会話（5件）
    supabase
      .from("ai_clone_conversation_log")
      .select("id, occurred_at, channel, summary, content")
      .eq("tenant_id", tenantId)
      .order("occurred_at", { ascending: false })
      .limit(5),
    // 期限が近い未完了タスク（5件、due_date asc、null は除外）
    supabase
      .from("ai_clone_task")
      .select("id, name, due_date, priority")
      .eq("tenant_id", tenantId)
      .neq("status", "完了")
      .not("due_date", "is", null)
      .order("due_date", { ascending: true })
      .limit(5),
    // 今月 出会った人（新規登録。created_at が今月）
    supabase
      .from("ai_clone_person")
      .select("id", countOpts)
      .eq("tenant_id", tenantId)
      .gte("created_at", monthStart)
      .lt("created_at", monthNextStart),
    // 重要人物（S/A）の一覧。ご無沙汰判定の母集団。
    supabase
      .from("ai_clone_person")
      .select("id, created_at")
      .eq("tenant_id", tenantId)
      .in("importance", ["S", "A"]),
    // 会話ログ経由の person_id ＋ 発生日時（全期間。今月の連絡＆最終接触日を JS で算出）
    supabase
      .from("ai_clone_person_conversation_logs")
      .select("person_id, ai_clone_conversation_log!inner(occurred_at, tenant_id)")
      .eq("ai_clone_conversation_log.tenant_id", tenantId),
    // 活動ログ経由の person_id ＋ 発生日（全期間）
    supabase
      .from("ai_clone_person_activity_logs")
      .select("person_id, ai_clone_activity_log!inner(occurred_date, tenant_id)")
      .eq("ai_clone_activity_log.tenant_id", tenantId),
  ]);

  // 今月集計
  const monthRevenue = (monthRevenueRows.data ?? []) as Array<{
    amount: number;
    payment_status: string | null;
  }>;
  const monthExpense = (monthExpenseRows.data ?? []) as Array<{
    amount: number;
  }>;
  const monthRevenueTotal = monthRevenue.reduce(
    (acc, r) => acc + (r.amount ?? 0),
    0,
  );
  const monthRevenueUnpaid = monthRevenue
    .filter((r) => r.payment_status !== "入金済")
    .reduce((acc, r) => acc + (r.amount ?? 0), 0);
  const monthExpenseTotal = monthExpense.reduce(
    (acc, r) => acc + (r.amount ?? 0),
    0,
  );
  const monthProfit = monthRevenueTotal - monthExpenseTotal;

  const decisions = (recentDecisions.data ?? []) as RecentDecisionRow[];
  const conversations = (recentConversations.data ?? []) as RecentConversationRow[];
  const tasksNearest = (nearestTasks.data ?? []) as RecentTaskRow[];

  // 会話・活動の全リンクを person_id → 日付（YYYY-MM-DD）のリストに正規化。
  // ここから「今月の連絡実人数」と「最終接触日」の両方を JS で算出する。
  const convLinks = (convPersonLinksAll.data ?? []) as Array<{
    person_id: string; ai_clone_conversation_log: unknown;
  }>;
  const actLinks = (actPersonLinksAll.data ?? []) as Array<{
    person_id: string; ai_clone_activity_log: unknown;
  }>;

  const touchDates: Array<{ personId: string; date: string }> = [];
  for (const r of convLinks) {
    const at = nestedDate(r.ai_clone_conversation_log, "occurred_at");
    if (r.person_id && at) touchDates.push({ personId: r.person_id, date: at.slice(0, 10) });
  }
  for (const r of actLinks) {
    const at = nestedDate(r.ai_clone_activity_log, "occurred_date");
    if (r.person_id && at) touchDates.push({ personId: r.person_id, date: at.slice(0, 10) });
  }

  // 今月 連絡した人の実人数（会話 ∪ 活動。person 重複なし）
  const contactedSet = new Set<string>();
  // 最終接触日マップ（person_id → 最新の YYYY-MM-DD）
  const lastTouchByPerson = new Map<string, string>();
  for (const t of touchDates) {
    if (t.date >= monthStart && t.date < monthNextStart) contactedSet.add(t.personId);
    const cur = lastTouchByPerson.get(t.personId);
    if (!cur || t.date > cur) lastTouchByPerson.set(t.personId, t.date);
  }
  const contactedThisMonth = contactedSet.size;

  // ご無沙汰の重要人物：S/A のうち、最終接触日（無ければ登録日）が30日より前の人数
  const thirtyDaysAgo = daysAgoISO(30);
  const saPeople = (saPeopleRes.data ?? []) as Array<{ id: string; created_at: string | null }>;
  let staleVipCount = 0;
  for (const p of saPeople) {
    const lastTouch = lastTouchByPerson.get(p.id)
      ?? (p.created_at ? p.created_at.slice(0, 10) : null);
    if (!lastTouch || lastTouch < thirtyDaysAgo) staleVipCount++;
  }

  // 要対応の合計（emergency セクションのトリガ）
  const attentionTotal =
    (overdueTaskCount.count ?? 0) +
    (promoteCandidateCount.count ?? 0) +
    (unreviewedKnowledgeCount.count ?? 0) +
    (needsFinalCheckFaqCount.count ?? 0) +
    (pendingDecisionProgressCount.count ?? 0);

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow={`AI CLONE / ${tenant.slug.toUpperCase()}`}
        title="ダッシュボード"
        description="右腕AI が今日の判断材料として読みに行く、あなたの脳の最新スナップショット。各セクションへの入口はここから。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip
              count={openTaskCount.count ?? 0}
              label="未完了タスク"
              tone="navy"
            />
            {attentionTotal > 0 && (
              <MetricChip
                count={attentionTotal}
                label="要対応"
                tone="gold"
              />
            )}
          </div>
        }
      />

      {/* 人脈の先行指標（出会い・接触はフロー、ご無沙汰は健全さ） */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-[#1c3550]" />
          <h2 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
            人脈の動き
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricBlock
            label="出会った人"
            value={`${newPeopleCount.count ?? 0} 人`}
            hint={`今月（${ym}）の新規登録`}
            tone="navy"
            href={`/clone/${slug}/people`}
          />
          <MetricBlock
            label="連絡した人"
            value={`${contactedThisMonth} 人`}
            hint={`今月（${ym}）・会話/活動の実人数（重複なし）`}
            tone="navy"
            href={`/clone/${slug}/logs/conversations`}
          />
          <MetricBlock
            label="ご無沙汰の重要人物"
            value={`${staleVipCount} 人`}
            hint="重要度S/A・30日以上連絡なし"
            tone={staleVipCount > 0 ? "alert" : "default"}
            href={`/clone/${slug}/people?importance=S,A`}
          />
        </div>
      </section>

      {/* 今月の数字 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[#1c3550]" />
          <h2 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
            今月の数字
          </h2>
          <span className="text-[11px] text-gray-400 tabular-nums">{ym}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricBlock
            label="今月の売上"
            value={formatYen(monthRevenueTotal)}
            tone="navy"
            href={`/clone/${slug}/finance/revenue`}
          />
          <MetricBlock
            label="今月の未入金"
            value={formatYen(monthRevenueUnpaid)}
            tone="gold"
            href={`/clone/${slug}/finance/revenue`}
          />
          <MetricBlock
            label="今月の経費"
            value={formatYen(monthExpenseTotal)}
            href={`/clone/${slug}/finance/expenses`}
          />
          <MetricBlock
            label="今月の粗利"
            value={formatYen(monthProfit)}
            hint="売上 − 経費（手入力ベース）"
            tone={monthProfit >= 0 ? "navy" : "alert"}
          />
        </div>
      </section>

      {/* 要対応 */}
      {attentionTotal > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-[#8a4538]" />
            <h2 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
              要対応
            </h2>
            <span className="text-[11px] text-gray-400">
              いま見直すべき項目
            </span>
          </div>
          <EditorialCard className="px-2 py-2">
            <div className="divide-y divide-gray-100">
              {(overdueTaskCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/tasks`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#8a4538]" />
                    <span className="text-sm text-gray-700">期限切れの未完了タスク</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a4538] tabular-nums">
                      {overdueTaskCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
              {(unreviewedKnowledgeCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/review/knowledge`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#fbf3e3] border border-[#e6d3a3]" />
                    <span className="text-sm text-gray-700">未確認のナレッジ候補</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a5a1c] tabular-nums">
                      {unreviewedKnowledgeCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
              {(promoteCandidateCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/review/decisions`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#8a5a1c]" />
                    <span className="text-sm text-gray-700">Core OS 昇格候補の判断</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a5a1c] tabular-nums">
                      {promoteCandidateCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
              {(pendingDecisionProgressCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/projects`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#fbf3e3] text-[#8a5a1c] border border-[#e6d3a3]">
                      要判断
                    </span>
                    <span className="text-sm text-gray-700">案件進捗の判断待ち</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a5a1c] tabular-nums">
                      {pendingDecisionProgressCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
              {(needsFinalCheckFaqCount.count ?? 0) > 0 && (
                <Link
                  href={`/clone/${slug}/core-os/faq`}
                  className="flex items-center justify-between px-3 py-2.5 rounded hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#8a5a1c]" />
                    <span className="text-sm text-gray-700">最終確認が必要な FAQ</span>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-[#8a5a1c] tabular-nums">
                      {needsFinalCheckFaqCount.count}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-gray-600" />
                  </span>
                </Link>
              )}
            </div>
          </EditorialCard>
        </section>
      )}

      {/* 件数サマリ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            Hub｜誰となに
          </h3>
          <div className="-mx-2">
            <CountRow
              label="人物"
              count={personCount.count ?? 0}
              href={`/clone/${slug}/people`}
            />
            <CountRow
              label="案件"
              count={projectCount.count ?? 0}
              href={`/clone/${slug}/projects`}
            />
            <CountRow
              label="サービス"
              count={serviceCount.count ?? 0}
              href={`/clone/${slug}/services`}
            />
          </div>
        </EditorialCard>

        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            Memory｜日々の蓄積
          </h3>
          <div className="-mx-2">
            <CountRow
              label="会話・活動ログ"
              count={conversationCount.count ?? 0}
              href={`/clone/${slug}/logs/conversations`}
            />
            <CountRow
              label="人物メモ"
              count={personNoteCount.count ?? 0}
              href={`/clone/${slug}/people`}
            />
            <CountRow
              label="案件進捗"
              count={progressLogCount.count ?? 0}
              href={`/clone/${slug}/projects`}
            />
            <CountRow
              label="活動ログ"
              count={activityLogCount.count ?? 0}
              href={`/clone/${slug}/finance/activities`}
            />
            <CountRow
              label="売上"
              count={revenueCount.count ?? 0}
              href={`/clone/${slug}/finance/revenue`}
            />
            <CountRow
              label="経費"
              count={expenseCount.count ?? 0}
              href={`/clone/${slug}/finance/expenses`}
            />
            <CountRow
              label="判断履歴"
              count={decisionLogCount.count ?? 0}
              href={`/clone/${slug}/review/decisions`}
            />
            <CountRow
              label="ナレッジ候補"
              count={knowledgeCount.count ?? 0}
              href={`/clone/${slug}/review/knowledge`}
            />
          </div>
        </EditorialCard>

        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            Core OS｜判断軸
          </h3>
          <div className="-mx-2">
            <CountRow
              label="ミッション理念"
              count={missionCount.count ?? 0}
              href={`/clone/${slug}/core-os/mission`}
            />
            <CountRow
              label="3年計画"
              count={threeYearPlanCount.count ?? 0}
              href={`/clone/${slug}/core-os/three-year-plan`}
            />
            <CountRow
              label="今年のKPI"
              count={annualKpiCount.count ?? 0}
              href={`/clone/${slug}/core-os/annual-kpi`}
            />
            <CountRow
              label="判断基準"
              count={principleCount.count ?? 0}
              href={`/clone/${slug}/core-os/decision-principles`}
            />
            <CountRow
              label="口調ルール"
              count={toneRuleCount.count ?? 0}
              href={`/clone/${slug}/core-os/tone-rules`}
            />
            <CountRow
              label="NGルール"
              count={ngRuleCount.count ?? 0}
              href={`/clone/${slug}/core-os/ng-rules`}
            />
            <CountRow
              label="FAQ"
              count={faqCount.count ?? 0}
              href={`/clone/${slug}/core-os/faq`}
            />
          </div>
        </EditorialCard>
      </div>

      {/* 最近の活動 + 期限が近いタスク */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 直近の判断 */}
        <EditorialCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
              直近の判断
            </h3>
            <Link
              href={`/clone/${slug}/review/decisions`}
              className="text-[11px] text-gray-500 hover:text-[#1c3550]"
            >
              すべて →
            </Link>
          </div>
          {decisions.length === 0 ? (
            <p className="text-[12px] text-gray-400">まだ記録なし</p>
          ) : (
            <ul className="space-y-3">
              {decisions.map((d) => (
                <li key={d.id} className="text-[12px]">
                  <div className="flex items-center gap-2 text-gray-500 tabular-nums mb-0.5">
                    {formatDateTime(d.occurred_at)}
                    {d.promote_to_core_os && (
                      <Sparkles className="w-2.5 h-2.5 text-[#8a5a1c]" />
                    )}
                  </div>
                  <p className="text-[13px] text-[#1c3550] font-medium leading-snug">
                    {d.theme || (
                      <span className="text-gray-400">
                        {d.conclusion?.slice(0, 40) || "—"}
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </EditorialCard>

        {/* 直近の会話 */}
        <EditorialCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
              直近の会話
            </h3>
            <Link
              href={`/clone/${slug}/logs/conversations`}
              className="text-[11px] text-gray-500 hover:text-[#1c3550]"
            >
              すべて →
            </Link>
          </div>
          {conversations.length === 0 ? (
            <p className="text-[12px] text-gray-400">まだ記録なし</p>
          ) : (
            <ul className="space-y-3">
              {conversations.map((c) => {
                const summary = (c.summary || c.content || "").split(/\r?\n/)[0];
                const excerpt =
                  summary.length > 50 ? `${summary.slice(0, 50)}…` : summary;
                return (
                  <li key={c.id} className="text-[12px]">
                    <div className="flex items-center gap-2 text-gray-500 tabular-nums mb-0.5">
                      <span>{formatDateTime(c.occurred_at)}</span>
                      {c.channel && (
                        <span className="px-1 py-0.5 rounded text-[10px] text-gray-600 bg-gray-100">
                          {c.channel}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-gray-700 leading-snug">
                      {excerpt || <span className="text-gray-400">—</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </EditorialCard>

        {/* 期限が近いタスク */}
        <EditorialCard className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550]">
              期限が近いタスク
            </h3>
            <Link
              href={`/clone/${slug}/tasks`}
              className="text-[11px] text-gray-500 hover:text-[#1c3550]"
            >
              すべて →
            </Link>
          </div>
          {tasksNearest.length === 0 ? (
            <p className="text-[12px] text-gray-400">期限つきの未完了タスクなし</p>
          ) : (
            <ul className="space-y-2.5">
              {tasksNearest.map((t) => {
                const overdue =
                  t.due_date !== null && t.due_date < today;
                return (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 text-[12px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-[13px] text-[#1c3550] truncate">
                        {t.name}
                      </span>
                    </div>
                    <span
                      className={`tabular-nums flex-shrink-0 ${
                        overdue
                          ? "text-[#8a4538] font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      {t.due_date ? formatDate(t.due_date) : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </EditorialCard>
      </div>

      {/* 最下部：tenant role 情報 */}
      <p className="text-[10px] tracking-[0.18em] text-gray-400 text-right">
        {tenant.name} ／ role: {role}
      </p>
    </div>
  );
}
