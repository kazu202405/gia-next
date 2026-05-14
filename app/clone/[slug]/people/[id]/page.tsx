// /clone/[slug]/people/[id] ─ 人物詳細ページ。
// プロフィール表示 + 編集 / 削除 + 関連エンティティ6種（案件/会話/活動/経費/タスク/判断）の紐付けUI。

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime, formatDate } from "@/app/admin/_components/EditorialFormat";
import { PersonEditDialog } from "../_components/PersonEditDialog";
import { PersonDeleteButton } from "../_components/PersonDeleteButton";
import { PersonTabs } from "./_components/PersonTabs";
import { RelatedSection, type RelatedItem } from "../../_components/RelatedSection";
import type { PickerCandidate } from "../../_components/LinkPickerDialog";
import {
  linkPersonProject,
  unlinkPersonProject,
  linkPersonConversationLog,
  unlinkPersonConversationLog,
  linkPersonActivityLog,
  unlinkPersonActivityLog,
  linkPersonExpense,
  unlinkPersonExpense,
  linkPersonTask,
  unlinkPersonTask,
  linkPersonDecisionLog,
  unlinkPersonDecisionLog,
} from "@/lib/ai-clone/links";
import type { PersonInput } from "../_actions";

export const dynamic = "force-dynamic";

interface PersonRow {
  id: string;
  name: string;
  company_name: string | null;
  position: string | null;
  relationship: string | null;
  importance: string | null;
  trust_level: string | null;
  temperature: string | null;
  referred_by: string | null;
  referred_to: string | null;
  referred_by_person_id: string | null;
  interests: string[] | null;
  challenges: string | null;
  caveats: string | null;
  next_action: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function importanceLabel(value: string | null): string {
  switch (value) {
    case "S":
      return "S（最重要）";
    case "A":
      return "A（重要）";
    case "B":
      return "B（通常）";
    case "C":
      return "C（参考）";
    default:
      return "—";
  }
}

// 詳細ページのキー/バリュー1行
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-[11px] tracking-[0.18em] text-gray-500 uppercase pt-0.5">
        {label}
      </div>
      <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {value || <span className="text-gray-300">—</span>}
      </div>
    </div>
  );
}

// 候補リストから既存リンク済みIDを除外したピッカー候補を作るヘルパー
function makeCandidates<T extends { id: string }>(
  all: T[],
  linkedIds: Set<string>,
  toCandidate: (row: T) => PickerCandidate,
): PickerCandidate[] {
  return all.filter((r) => !linkedIds.has(r.id)).map(toCandidate);
}

// yen 表記
function yen(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_person")
    .select(
      "id, name, company_name, position, relationship, importance, trust_level, temperature, referred_by, referred_to, referred_by_person_id, interests, challenges, caveats, next_action, created_at, updated_at",
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const person = data as PersonRow;

  // 紹介元の人物（FK ある場合のリンク先名前） + 紹介先（この人物を referred_by_person_id とする逆引き一覧）
  const [referrerRow, referredToList] = await Promise.all([
    person.referred_by_person_id
      ? supabase
          .from("ai_clone_person")
          .select("id, name")
          .eq("tenant_id", tenant.id)
          .eq("id", person.referred_by_person_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("ai_clone_person")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .eq("referred_by_person_id", person.id)
      .order("name", { ascending: true }),
  ]);
  const referrer = (referrerRow.data ?? null) as { id: string; name: string } | null;
  const referredToPeople = (referredToList.data ?? []) as { id: string; name: string }[];

  // 並列取得: メモ件数 + 6種のリンク現状 + 6種の候補マスター
  const [
    noteCountRes,
    linkProjects,
    linkConversations,
    linkActivities,
    linkExpenses,
    linkTasks,
    linkDecisions,
    allProjects,
    allConversations,
    allActivities,
    allExpenses,
    allTasks,
    allDecisions,
  ] = await Promise.all([
    supabase
      .from("ai_clone_person_note")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_projects")
      .select("project_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_conversation_logs")
      .select("conversation_log_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_activity_logs")
      .select("activity_log_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_expenses")
      .select("expense_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_tasks")
      .select("task_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_person_decision_logs")
      .select("decision_log_id")
      .eq("person_id", person.id),
    supabase
      .from("ai_clone_project")
      .select("id, name, status, due_date")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("ai_clone_conversation_log")
      .select("id, occurred_at, summary, channel, content")
      .eq("tenant_id", tenant.id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("ai_clone_activity_log")
      .select("id, occurred_date, content, activity_type")
      .eq("tenant_id", tenant.id)
      .order("occurred_date", { ascending: false }),
    supabase
      .from("ai_clone_expense")
      .select("id, occurred_date, amount, category, payee")
      .eq("tenant_id", tenant.id)
      .order("occurred_date", { ascending: false }),
    supabase
      .from("ai_clone_task")
      .select("id, name, status, due_date")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("ai_clone_decision_log")
      .select("id, occurred_at, theme, conclusion")
      .eq("tenant_id", tenant.id)
      .order("occurred_at", { ascending: false }),
  ]);

  const noteCount = noteCountRes.count ?? 0;
  const linkedProjectIds = new Set(
    (linkProjects.data ?? []).map((r: { project_id: string }) => r.project_id),
  );
  const linkedConvIds = new Set(
    (linkConversations.data ?? []).map(
      (r: { conversation_log_id: string }) => r.conversation_log_id,
    ),
  );
  const linkedActivityIds = new Set(
    (linkActivities.data ?? []).map(
      (r: { activity_log_id: string }) => r.activity_log_id,
    ),
  );
  const linkedExpenseIds = new Set(
    (linkExpenses.data ?? []).map((r: { expense_id: string }) => r.expense_id),
  );
  const linkedTaskIds = new Set(
    (linkTasks.data ?? []).map((r: { task_id: string }) => r.task_id),
  );
  const linkedDecisionIds = new Set(
    (linkDecisions.data ?? []).map(
      (r: { decision_log_id: string }) => r.decision_log_id,
    ),
  );

  type ProjectRow = {
    id: string;
    name: string;
    status: string | null;
    due_date: string | null;
  };
  type ConvRow = {
    id: string;
    occurred_at: string;
    summary: string | null;
    channel: string | null;
    content: string | null;
  };
  type ActRow = {
    id: string;
    occurred_date: string;
    content: string | null;
    activity_type: string | null;
  };
  type ExpRow = {
    id: string;
    occurred_date: string;
    amount: number;
    category: string | null;
    payee: string | null;
  };
  type TaskRow = {
    id: string;
    name: string;
    status: string | null;
    due_date: string | null;
  };
  type DecRow = {
    id: string;
    occurred_at: string;
    theme: string | null;
    conclusion: string | null;
  };

  const projectRows = (allProjects.data ?? []) as ProjectRow[];
  const convRows = (allConversations.data ?? []) as ConvRow[];
  const actRows = (allActivities.data ?? []) as ActRow[];
  const expRows = (allExpenses.data ?? []) as ExpRow[];
  const taskRows = (allTasks.data ?? []) as TaskRow[];
  const decRows = (allDecisions.data ?? []) as DecRow[];

  // 既存リンクの表示用 RelatedItem 配列（候補マスターから絞り込み）
  const projectItems: RelatedItem[] = projectRows
    .filter((p) => linkedProjectIds.has(p.id))
    .map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: [p.status, p.due_date ? `期限 ${formatDate(p.due_date)}` : null]
        .filter(Boolean)
        .join(" / "),
      href: `/clone/${slug}/projects/${p.id}`,
    }));
  const convItems: RelatedItem[] = convRows
    .filter((c) => linkedConvIds.has(c.id))
    .map((c) => ({
      id: c.id,
      label: c.summary ?? c.content?.slice(0, 60) ?? "（無題）",
      sublabel: [
        formatDateTime(c.occurred_at),
        c.channel,
      ]
        .filter(Boolean)
        .join(" / "),
    }));
  const actItems: RelatedItem[] = actRows
    .filter((a) => linkedActivityIds.has(a.id))
    .map((a) => ({
      id: a.id,
      label: a.content?.slice(0, 60) ?? a.activity_type ?? "（無題）",
      sublabel: [formatDate(a.occurred_date), a.activity_type]
        .filter(Boolean)
        .join(" / "),
    }));
  const expItems: RelatedItem[] = expRows
    .filter((e) => linkedExpenseIds.has(e.id))
    .map((e) => ({
      id: e.id,
      label: `${yen(e.amount)} ${e.category ?? ""}`.trim(),
      sublabel: [formatDate(e.occurred_date), e.payee]
        .filter(Boolean)
        .join(" / "),
    }));
  const taskItems: RelatedItem[] = taskRows
    .filter((t) => linkedTaskIds.has(t.id))
    .map((t) => ({
      id: t.id,
      label: t.name,
      sublabel: [t.status, t.due_date ? `期限 ${formatDate(t.due_date)}` : null]
        .filter(Boolean)
        .join(" / "),
    }));
  const decItems: RelatedItem[] = decRows
    .filter((d) => linkedDecisionIds.has(d.id))
    .map((d) => ({
      id: d.id,
      label: d.theme ?? d.conclusion?.slice(0, 60) ?? "（無題）",
      sublabel: [
        formatDateTime(d.occurred_at),
        d.conclusion ? d.conclusion.slice(0, 40) : null,
      ]
        .filter(Boolean)
        .join(" / "),
    }));

  // ピッカー候補（既存リンク済を除外）
  const projectCandidates = makeCandidates(projectRows, linkedProjectIds, (p) => ({
    id: p.id,
    label: p.name,
    sublabel: p.status ?? null,
  }));
  const convCandidates = makeCandidates(convRows, linkedConvIds, (c) => ({
    id: c.id,
    label: c.summary ?? c.content?.slice(0, 60) ?? "（無題）",
    sublabel: [formatDateTime(c.occurred_at), c.channel]
      .filter(Boolean)
      .join(" / "),
  }));
  const actCandidates = makeCandidates(actRows, linkedActivityIds, (a) => ({
    id: a.id,
    label: a.content?.slice(0, 60) ?? a.activity_type ?? "（無題）",
    sublabel: [formatDate(a.occurred_date), a.activity_type]
      .filter(Boolean)
      .join(" / "),
  }));
  const expCandidates = makeCandidates(expRows, linkedExpenseIds, (e) => ({
    id: e.id,
    label: `${yen(e.amount)} ${e.category ?? ""}`.trim(),
    sublabel: [formatDate(e.occurred_date), e.payee]
      .filter(Boolean)
      .join(" / "),
  }));
  const taskCandidates = makeCandidates(taskRows, linkedTaskIds, (t) => ({
    id: t.id,
    label: t.name,
    sublabel: t.status ?? null,
  }));
  const decCandidates = makeCandidates(decRows, linkedDecisionIds, (d) => ({
    id: d.id,
    label: d.theme ?? d.conclusion?.slice(0, 60) ?? "（無題）",
    sublabel: formatDateTime(d.occurred_at),
  }));

  // Edit ダイアログに渡す初期値（PersonInput 形）
  const initial: PersonInput = {
    name: person.name,
    company_name: person.company_name ?? "",
    position: person.position ?? "",
    relationship: person.relationship ?? "",
    importance: person.importance ?? "",
    temperature: person.temperature ?? "",
    referred_by: person.referred_by ?? "",
    challenges: person.challenges ?? "",
    caveats: person.caveats ?? "",
    next_action: person.next_action ?? "",
  };

  // server action を personId/tenantId で bind してクライアントへ
  type LinkFn = (
    slug: string,
    tenantId: string,
    personId: string,
    rightId: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  const bindLink = (fn: LinkFn) =>
    fn.bind(null, slug, tenant.id, person.id) as (
      rightId: string,
    ) => Promise<{ ok: boolean; error?: string }>;

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      {/* 戻る導線 */}
      <Link
        href={`/clone/${slug}/people`}
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] text-gray-500 hover:text-[#1c3550] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        人物一覧に戻る
      </Link>

      <EditorialHeader
        eyebrow="HUB / PEOPLE"
        title={person.name}
        description={
          [person.company_name, person.position].filter(Boolean).join(" / ") ||
          undefined
        }
        right={
          <div className="flex items-center gap-2">
            <PersonEditDialog
              slug={slug}
              tenantId={tenant.id}
              personId={person.id}
              initial={initial}
            />
            <PersonDeleteButton
              slug={slug}
              tenantId={tenant.id}
              personId={person.id}
              personName={person.name}
            />
          </div>
        }
      />

      <PersonTabs slug={slug} personId={person.id} noteCount={noteCount} />

      {/* メイン情報 */}
      <EditorialCard className="px-6 py-2">
        <Row label="重要度" value={importanceLabel(person.importance)} />
        <Row label="関係性" value={person.relationship} />
        <Row label="温度感" value={person.temperature} />
        <Row label="信頼度" value={person.trust_level} />
        <Row
          label="紹介元"
          value={
            referrer ? (
              <Link
                href={`/clone/${slug}/people/${referrer.id}`}
                className="text-[#1c3550] hover:text-[#c08a3e] underline-offset-2 hover:underline"
              >
                {referrer.name}
              </Link>
            ) : (
              person.referred_by
            )
          }
        />
        <Row
          label="紹介先"
          value={
            referredToPeople.length > 0 ? (
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                {referredToPeople.map((p, idx) => (
                  <span key={p.id} className="inline-flex items-center">
                    <Link
                      href={`/clone/${slug}/people/${p.id}`}
                      className="text-[#1c3550] hover:text-[#c08a3e] underline-offset-2 hover:underline"
                    >
                      {p.name}
                    </Link>
                    {idx < referredToPeople.length - 1 && (
                      <span className="text-gray-300 ml-2">/</span>
                    )}
                  </span>
                ))}
                {person.referred_to && (
                  <span className="text-gray-400 text-xs ml-2">
                    （メモ: {person.referred_to}）
                  </span>
                )}
              </div>
            ) : (
              person.referred_to
            )
          }
        />
        <Row
          label="関心ごと"
          value={
            person.interests && person.interests.length > 0
              ? person.interests.join("、")
              : null
          }
        />
        <Row label="課題" value={person.challenges} />
        <Row label="注意点" value={person.caveats} />
        <Row label="次のアクション" value={person.next_action} />
      </EditorialCard>

      {/* 関連エンティティ 6セクション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RelatedSection
          title="関連案件"
          pickerTitle="案件を紐付け"
          triggerLabel="案件を追加"
          pickerEmptyMessage="案件マスターに登録がありません"
          items={projectItems}
          candidates={projectCandidates}
          onLink={bindLink(linkPersonProject)}
          onUnlink={bindLink(unlinkPersonProject)}
        />
        <RelatedSection
          title="関連会話ログ"
          pickerTitle="会話ログを紐付け"
          triggerLabel="会話を追加"
          pickerEmptyMessage="会話ログがありません"
          items={convItems}
          candidates={convCandidates}
          onLink={bindLink(linkPersonConversationLog)}
          onUnlink={bindLink(unlinkPersonConversationLog)}
        />
        <RelatedSection
          title="関連活動ログ"
          pickerTitle="活動を紐付け"
          triggerLabel="活動を追加"
          pickerEmptyMessage="活動ログがありません"
          items={actItems}
          candidates={actCandidates}
          onLink={bindLink(linkPersonActivityLog)}
          onUnlink={bindLink(unlinkPersonActivityLog)}
        />
        <RelatedSection
          title="関連経費"
          pickerTitle="経費を紐付け"
          triggerLabel="経費を追加"
          pickerEmptyMessage="経費がありません"
          items={expItems}
          candidates={expCandidates}
          onLink={bindLink(linkPersonExpense)}
          onUnlink={bindLink(unlinkPersonExpense)}
        />
        <RelatedSection
          title="関連タスク"
          pickerTitle="タスクを紐付け"
          triggerLabel="タスクを追加"
          pickerEmptyMessage="タスクがありません"
          items={taskItems}
          candidates={taskCandidates}
          onLink={bindLink(linkPersonTask)}
          onUnlink={bindLink(unlinkPersonTask)}
        />
        <RelatedSection
          title="関連判断履歴"
          pickerTitle="判断を紐付け"
          triggerLabel="判断を追加"
          pickerEmptyMessage="判断履歴がありません"
          items={decItems}
          candidates={decCandidates}
          onLink={bindLink(linkPersonDecisionLog)}
          onUnlink={bindLink(unlinkPersonDecisionLog)}
        />
      </div>

      <p className="text-[10px] tracking-[0.18em] text-gray-400 text-right">
        作成 {formatDateTime(person.created_at)} ／ 更新{" "}
        {formatDateTime(person.updated_at)}
      </p>
    </div>
  );
}
