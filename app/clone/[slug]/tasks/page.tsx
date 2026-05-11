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
import { TaskEditDialog } from "./_components/TaskEditDialog";
import { TaskDeleteButton } from "./_components/TaskDeleteButton";

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

export default async function TasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  // 並び順：完了は後ろ、未完了は due_date asc（NULL は最後）、created_at desc
  const { data, error } = await supabase
    .from("ai_clone_task")
    .select("id, name, status, priority, due_date, purpose, created_at")
    .eq("tenant_id", tenant.id)
    .order("status", { ascending: true }) // 未着手→進行中→完了→保留 を辞書順で。完了の後ろ寄せは下で再ソート
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  // クライアント側で「完了は最後尾」に明示ソート
  const tasks = ((data ?? []) as TaskRow[]).slice().sort((a, b) => {
    const aDone = a.status === "完了" ? 1 : 0;
    const bDone = b.status === "完了" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return 0; // それ以外は SQL の順序を維持
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

      {error && (
        <EditorialCard className="px-5 py-4">
          <p className="text-[13px] text-[#8a4538]">
            一覧の取得に失敗しました：{error.message}
          </p>
        </EditorialCard>
      )}

      {!error && tasks.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            タスクはまだありません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「タスクを追加」から、期限・優先度のある作業を入れていきます。
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
                <li
                  key={t.id}
                  className="md:grid md:grid-cols-[24px_2fr_0.7fr_0.5fr_0.8fr_1.2fr_0.4fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group"
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
                  <div className="flex items-center justify-end gap-0.5 mt-1 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TaskEditDialog
                      slug={slug}
                      tenantId={tenant.id}
                      taskId={t.id}
                      initial={initial}
                    />
                    <TaskDeleteButton
                      slug={slug}
                      tenantId={tenant.id}
                      taskId={t.id}
                      label={t.name}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </EditorialCard>
      )}
    </div>
  );
}
