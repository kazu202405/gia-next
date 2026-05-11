// /clone/[slug]/people/[id] ─ 人物詳細ページ。
// プロフィール表示 + 編集 / 削除 ボタン。関連案件・会話ログ・人物メモは Phase 1 残として
// プレースホルダで枠だけ出す。

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { createClient } from "@/lib/supabase/server";
import {
  EditorialHeader,
  EditorialCard,
} from "@/app/admin/_components/EditorialChrome";
import { formatDateTime } from "@/app/admin/_components/EditorialFormat";
import { PersonEditDialog } from "../_components/PersonEditDialog";
import { PersonDeleteButton } from "../_components/PersonDeleteButton";
import { PersonTabs } from "./_components/PersonTabs";
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
      "id, name, company_name, position, relationship, importance, trust_level, temperature, referred_by, referred_to, interests, challenges, caveats, next_action, created_at, updated_at",
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const person = data as PersonRow;

  // タブの「メモ N件」表示用に件数だけ並列取得
  const { count: noteCount } = await supabase
    .from("ai_clone_person_note")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .eq("person_id", person.id);

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

      <PersonTabs
        slug={slug}
        personId={person.id}
        noteCount={noteCount ?? 0}
      />

      {/* メイン情報 */}
      <EditorialCard className="px-6 py-2">
        <Row label="重要度" value={importanceLabel(person.importance)} />
        <Row label="関係性" value={person.relationship} />
        <Row label="温度感" value={person.temperature} />
        <Row label="信頼度" value={person.trust_level} />
        <Row label="紹介元" value={person.referred_by} />
        <Row label="紹介先" value={person.referred_to} />
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

      {/* 関連（人物メモは「メモ」タブに移管。残り2つは Phase 1 残） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            関連案件
          </h3>
          <p className="text-[12px] text-gray-400">Phase 1 残：人物 ⇄ 案件のリンクUI</p>
        </EditorialCard>
        <EditorialCard className="p-5">
          <h3 className="font-serif text-sm tracking-[0.18em] text-[#1c3550] mb-3">
            会話ログ
          </h3>
          <p className="text-[12px] text-gray-400">Phase 1 残：conversation_log のリンク</p>
        </EditorialCard>
      </div>

      <p className="text-[10px] tracking-[0.18em] text-gray-400 text-right">
        作成 {formatDateTime(person.created_at)} ／ 更新{" "}
        {formatDateTime(person.updated_at)}
      </p>
    </div>
  );
}
