// /clone/[slug]/logs/conversations の Server Actions。12_会話ログ。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ConversationInput {
  occurred_at: string; // datetime-local の値（"YYYY-MM-DDTHH:mm"）。必須
  speaker?: string | null;
  channel?: string | null; // Slack / LINE / Email / 対面 / 電話 / その他
  content?: string | null;
  summary?: string | null;
  usage_tags?: string | null; // カンマ / 改行 / スペース区切り → text[] に変換
  importance?: string | null; // S / A / B / C
  next_action?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

// "tag1, tag2 / tag3 タグ4" のような自由入力を text[] に正規化する。
// カンマ・スラッシュ・改行・全角スペースで分割し、空要素を除去。
const parseTags = (v: string | null | undefined): string[] | null => {
  if (!v) return null;
  const parts = v
    .split(/[,、\/\n\r　]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : null;
};

export async function createConversation(
  slug: string,
  tenantId: string,
  input: ConversationInput,
): Promise<{ ok: boolean; error?: string }> {
  const occurredRaw = input.occurred_at?.trim() ?? "";
  if (occurredRaw.length === 0) {
    return { ok: false, error: "日時は必須です" };
  }
  const occurredAtDate = new Date(occurredRaw);
  if (Number.isNaN(occurredAtDate.getTime())) {
    return { ok: false, error: "日時の形式が不正です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_conversation_log").insert({
    tenant_id: tenantId,
    occurred_at: occurredAtDate.toISOString(),
    speaker: norm(input.speaker),
    channel: norm(input.channel),
    content: norm(input.content),
    summary: norm(input.summary),
    usage_tags: parseTags(input.usage_tags),
    importance: norm(input.importance),
    next_action: norm(input.next_action),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/logs/conversations`);
  return { ok: true };
}
