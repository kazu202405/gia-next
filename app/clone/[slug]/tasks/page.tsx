// /clone/[slug]/tasks ─ Memory / タスクの一覧 + 追加。
// チェックボックスで「完了 ⇄ 未着手」をワンクリック切替可能。
// それ以外のステータス変更（進行中・保留）と編集・削除・人物/案件紐付けは Phase 1 残。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDate } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { TaskAddDialog } from "./_components/TaskAddDialog";
import { TaskStatusToggle } from "./_components/TaskStatusToggle";
import { TaskRow } from "./_components/TaskRow";
import { TaskFilterBar } from "./_components/TaskFilterBar";

export const dynamic = "force-dynamic";

interface TaskRow {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  purpose: string | null;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<
    string,
    { bg: string; border: string; text: string; dotBg: string }
  > = {
    未着手: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", dotBg: "bg-gray-400" },
    進行中: { bg: "bg-[#f1f4f7]", border: "border-[#d6dde5]", text: "text-[#1c3550]", dotBg: "bg-[#1c3550]" },
    完了: { bg: "bg-[#e9efe9]", border: "border-[#c5d3c8]", text: "text-[#3d6651]", dotBg: "bg-[#3d6651]" },
    保留: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]", dotBg: "bg-[#c08a3e]" },
  };
  const s = styles[status] ?? styles["未着手"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${s.bg} ${s.border} ${s.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotBg}`} />
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<
    string,
    { bg: string; border: string; text: string }
  > = {
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

// 期限が今日以前で未完了なら警告色
function isOverdue(due: string | null, status: string | null): boolean {
  if (!due) return false;
  if (status === "完了") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  return d.getTime() < today.getTime();
}

// 期限フィルタ：range キーから due_date 上限の "YYYY-MM-DD" を返す。
// "overdue" だけは特別扱い（due_date < 今日 AND 未完了）。
function computeDueFilter(range: string): {
  dueOnOrBefore?: string;
  overdueOnly?: boolean;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (range === "today") return { dueOnOrBefore: fmt(today) };
  if (range === "week") {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return { dueOnOrBefore: fmt(d) };
  }
  if (range === "month") {
    // 今月末（翌月 0 日 = 今月末日）
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { dueOnOrBefore: fmt(d) };
  }
  if (range === "overdue") return { overdueOnly: true };
  return {};
}

function sanitizeForOr(s: string): string {
  return s.replace(/[,()]/g, "").trim();
}

function parseCsvParam(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw[0] : raw;
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

// 優先度の表示順（数値が小さいほど上位）
const PRIORITY_ORDER: Record<string, number> = {
  高: 0,
  中: 1,
  低: 2,
};

export default async function TasksPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = sanitizeForOr((sp.q ?? "").toString());
  const statuses = parseCsvParam(sp.status);
  const priorities = parseCsvParam(sp.priority);
  const range = (sp.range ?? "all").toString();
  const sort = (sp.sort ?? "due_asc").toString();

  const { tenant } = await loadTenantOr404(slug);
  const supabase = await createClient();

  let mainQuery = supabase
    .from("ai_clone_task")
    .select("id, name, status, priority, due_date, purpose, created_at")
    .eq("tenant_id", tenant.id);

  if (statuses.length > 0) mainQuery = mainQuery.in("status", statuses);
  if (priorities.length > 0) mainQuery = mainQuery.in("priority", priorities);
  if (q) {
    mainQuery = mainQuery.or(`name.ilike.%${q}%,purpose.ilike.%${q}%`);
  }
  const dueFilter = computeDueFilter(range);
  if (dueFilter.dueOnOrBefore) {
    mainQuery = mainQuery.lte("due_date", dueFilter.dueOnOrBefore);
  }
  if (dueFilter.overdueOnly) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    mainQuery = mainQuery.lt("due_date", todayStr).neq("status", "完了");
  }

  // ソート（priority だけは client-side で表示順制御）
  if (sort === "due_desc") {
    mainQuery = mainQuery.order("due_date", { ascending: false, nullsFirst: false });
  } else if (sort === "created_asc") {
    mainQuery = mainQuery.order("created_at", { ascending: true });
  } else if (sort === "created_desc") {
    mainQuery = mainQuery.order("created_at", { ascending: false });
  } else if (sort === "priority_asc") {
    // 一旦 due_date asc で並べてから、下で client-side に priority 優先で再ソート
    mainQuery = mainQuery.order("due_date", { ascending: true, nullsFirst: false });
  } else {
    // デフォルト due_asc
    mainQuery = mainQuery.order("due_date", { ascending: true, nullsFirst: false });
  }

  const [logsRes, totalRes] = await Promise.all([
    mainQuery,
    supabase
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id),
  ]);
  const { data, error } = logsRes;
  const totalCount = totalRes.count ?? 0;
  const hasActiveFilter =
    q.length > 0 || statuses.length > 0 || priorities.length > 0
    || (range !== "" && range !== "all");

  // クライアント側ソート：
  //   1) sort=priority_asc の時は priority 順を最優先（高→中→低→null）
  //   2) いずれの sort でも「完了」は最後尾に寄せる
  let tasks = ((data ?? []) as TaskRow[]).slice();
  if (sort === "priority_asc") {
    tasks.sort((a, b) => {
      const ap = PRIORITY_ORDER[a.priority ?? ""] ?? 99;
      const bp = PRIORITY_ORDER[b.priority ?? ""] ?? 99;
      return ap - bp;
    });
  }
  tasks = tasks.sort((a, b) => {
    const aDone = a.status === "完了" ? 1 : 0;
    const bDone = b.status === "完了" ? 1 : 0;
    return aDone - bDone;
  });

  const openCount = tasks.filter((t) => t.status !== "完了").length;

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="MEMORY / TASKS"
        title="タスク"
        description="期限のある作業。優先度・期限・目的を一目で。チェックで完了 ⇄ 未着手 を切り替え可能。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={openCount} label="未完了" tone="navy" />
            <TaskAddDialog slug={slug} tenantId={tenant.id} />
          </div>
        }
      />

      {totalCount > 0 && (
        <TaskFilterBar
          filteredCount={tasks.length}
          totalCount={totalCount}
        />
      )}

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && tasks.length === 0 && !hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            タスクはまだありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「タスクを追加」から、期限・優先度のある作業を入れていきます。
          </p>
        </EditorialCard>
      )}

      {!error && tasks.length === 0 && hasActiveFilter && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            条件に一致するタスクはありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            検索キーワードやフィルタを見直してみてください。
            <br />
            上部「フィルタ解除」で全件表示に戻せます。
          </p>
        </EditorialCard>
      )}

      {!error && tasks.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[24px_2fr_0.7fr_0.5fr_0.8fr_1.2fr_0.4fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60 text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            <span></span>
            <span>タスク名</span>
            <span>状態</span>
            <span>優先</span>
            <span>期限</span>
            <span>目的</span>
            <span></span>
          </div>

          <ul className="divide-y divide-gray-100">
            {tasks.map((t) => {
              const done = t.status === "完了";
              const overdue = isOverdue(t.due_date, t.status);
              const initial = {
                name: t.name,
                status: t.status ?? "未着手",
                priority: t.priority ?? "",
                due_date: t.due_date ?? "",
                purpose: t.purpose ?? "",
                origin_log: "",
              };
              return (
                <li key={t.id}>
                  <TaskRow
                    slug={slug}
                    tenantId={tenant.id}
                    taskId={t.id}
                    initial={initial}
                    deleteLabel={t.name}
                    gridCols="md:grid-cols-[24px_2fr_0.7fr_0.5fr_0.8fr_1.2fr_0.4fr]"
                  >
                    <div className="flex md:block items-center">
                      <TaskStatusToggle
                        slug={slug}
                        tenantId={tenant.id}
                        taskId={t.id}
                        status={t.status}
                      />
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        done
                          ? "text-gray-400 line-through"
                          : "text-[#1c3550]"
                      }`}
                    >
                      {t.name}
                    </div>
                    <div className="mt-1 md:mt-0">
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-1 md:mt-0">
                      <PriorityBadge priority={t.priority} />
                    </div>
                    <div
                      className={`text-[12px] mt-1 md:mt-0 tabular-nums ${
                        overdue ? "text-[#8a4538] font-bold" : "text-gray-500"
                      }`}
                    >
                      {t.due_date ? formatDate(t.due_date) : "—"}
                    </div>
                    <div
                      className={`text-[13px] mt-1 md:mt-0 truncate ${
                        done ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {t.purpose || <span className="text-gray-300">—</span>}
                    </div>
                  </TaskRow>
                </li>
              );
            })}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
