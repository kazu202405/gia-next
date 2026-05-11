// /clone/[slug]/logs/conversations ─ Memory / 会話ログの一覧 + 追加。
// 詳細・編集・削除は Phase 1 残（Hub と同パターンで後追い実装可能）。

import {
  EditorialHeader,
  EditorialCard,
  MetricChip,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import { ConversationAddDialog } from "./_components/ConversationAddDialog";
import { ConversationEditDialog } from "./_components/ConversationEditDialog";
import { ConversationDeleteButton } from "./_components/ConversationDeleteButton";

export const dynamic = "force-dynamic";

interface ConversationRow {
  id: string;
  occurred_at: string;
  speaker: string | null;
  channel: string | null;
  summary: string | null;
  content: string | null;
  importance: string | null;
  next_action: string | null;
  usage_tags: string[] | null;
}

function ImportanceBadge({ importance }: { importance: string | null }) {
  if (!importance) return <span className="text-[11px] text-gray-300">—</span>;
  const styles: Record<
    string,
    { bg: string; border: string; text: string; dotBg: string }
  > = {
    S: { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]", dotBg: "bg-[#c08a3e]" },
    A: { bg: "bg-[#f1f4f7]", border: "border-[#d6dde5]", text: "text-[#1c3550]", dotBg: "bg-[#1c3550]" },
    B: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", dotBg: "bg-gray-400" },
    C: { bg: "bg-gray-50", border: "border-gray-100", text: "text-gray-400", dotBg: "bg-gray-300" },
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

function ChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return <span className="text-[11px] text-gray-300">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-700 bg-gray-100 border border-gray-200">
      {channel}
    </span>
  );
}

// 一覧での要約表示。summary があれば優先、なければ content の最初の1行抜粋
function excerpt(
  summary: string | null,
  content: string | null,
  max = 90,
): string | null {
  const src = (summary?.trim() || content?.trim() || "").split(/\r?\n/)[0];
  if (!src) return null;
  return src.length > max ? `${src.slice(0, max)}…` : src;
}

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant } = await loadTenantOr404(slug);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_clone_conversation_log")
    .select(
      "id, occurred_at, speaker, channel, summary, content, importance, next_action, usage_tags",
    )
    .eq("tenant_id", tenant.id)
    .order("occurred_at", { ascending: false });

  const logs = (data ?? []) as ConversationRow[];

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6">
      <EditorialHeader
        eyebrow="MEMORY / LOGS"
        title="会話・活動ログ"
        description="商談・面談・電話・LINE の記録。AI Clone が「過去の言質」を引用するためのソース。"
        right={
          <div className="flex items-center gap-2">
            <MetricChip count={logs.length} label="記録済み" tone="navy" />
            <ConversationAddDialog slug={slug} tenantId={tenant.id} />
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

      {!error && logs.length === 0 && (
        <EditorialCard className="px-6 py-12 text-center">
          <p className="font-serif text-base text-[#1c3550] mb-2">
            まだ会話が記録されていません
          </p>
          <p className="text-[12px] text-gray-500 leading-relaxed">
            右上の「会話を記録」から、商談・電話・LINE のやり取りを記録していきます。
            <br />
            日時と要約だけでもOK。タグ・次アクションは後から書き足せます。
          </p>
        </EditorialCard>
      )}

      {!error && logs.length > 0 && (
        <EditorialCard variant="row" className="overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.1fr_0.7fr_0.8fr_2.2fr_0.5fr_1.1fr_0.4fr] gap-4 px-5 py-3 border-b border-gray-200 bg-gray-50/60 text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            <span>日時</span>
            <span>チャンネル</span>
            <span>発言者</span>
            <span>要約</span>
            <span>重要度</span>
            <span>次のアクション</span>
            <span></span>
          </div>

          <ul className="divide-y divide-gray-100">
            {logs.map((l) => {
              // Edit ダイアログに渡す初期値
              const initial = {
                occurred_at: l.occurred_at
                  ? new Date(l.occurred_at).toISOString().slice(0, 16)
                  : "",
                speaker: l.speaker ?? "",
                channel: l.channel ?? "",
                content: l.content ?? "",
                summary: l.summary ?? "",
                usage_tags: l.usage_tags ? l.usage_tags.join(", ") : "",
                importance: l.importance ?? "",
                next_action: l.next_action ?? "",
              };
              const label =
                l.summary?.slice(0, 30) ||
                l.content?.slice(0, 30) ||
                formatDateTime(l.occurred_at);
              return (
                <li
                  key={l.id}
                  className="md:grid md:grid-cols-[1.1fr_0.7fr_0.8fr_2.2fr_0.5fr_1.1fr_0.4fr] gap-4 px-5 py-3.5 hover:bg-gray-50/60 transition-colors group"
                >
                  <div className="text-[12px] text-gray-700 tabular-nums">
                    {formatDateTime(l.occurred_at)}
                  </div>
                  <div className="mt-1 md:mt-0">
                    <ChannelBadge channel={l.channel} />
                  </div>
                  <div className="text-[13px] text-gray-700 mt-1 md:mt-0">
                    {l.speaker || <span className="text-gray-300">—</span>}
                  </div>
                  <div className="text-[13px] text-gray-800 mt-1 md:mt-0 leading-relaxed">
                    {excerpt(l.summary, l.content) || (
                      <span className="text-gray-300">—</span>
                    )}
                    {l.usage_tags && l.usage_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {l.usage_tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-gray-500 bg-white border border-gray-200"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 md:mt-0">
                    <ImportanceBadge importance={l.importance} />
                  </div>
                  <div className="text-[13px] text-gray-600 mt-1 md:mt-0 truncate">
                    {l.next_action || (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-0.5 mt-1 md:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ConversationEditDialog
                      slug={slug}
                      tenantId={tenant.id}
                      conversationId={l.id}
                      initial={initial}
                    />
                    <ConversationDeleteButton
                      slug={slug}
                      tenantId={tenant.id}
                      conversationId={l.id}
                      label={label}
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
