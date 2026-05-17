// /clone/[slug]/people の Server Actions。
// テナント member 判定は ai_clone_person への RLS（ai_clone_is_tenant_member(tenant_id)）が
// 自動で実行する。サーバ側ではフィールドの whitelist 化と name の必須チェックだけ持つ。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 追加フォームから受け取るフィールド。型と必須/任意の明示。
// ai_clone_person の DB スキーマと 1:1（trust_level / interests / referred_to / birth_hour は今回 UI に出さないので除外）。
// birth_hour は /admin/divination からの保存でのみ書き込まれ、編集 UI には出さない方針（ユーザー要望）。
export interface PersonInput {
  name: string;
  company_name?: string | null;
  position?: string | null;
  relationship?: string | null;
  importance?: string | null; // S / A / B / C
  temperature?: string | null;
  referred_by?: string | null;
  challenges?: string | null;
  caveats?: string | null;
  next_action?: string | null;
  // 2026-05-17 追加。鑑定ツール経由でも編集ダイアログ経由でも入れられる。
  birthday?: string | null;   // ISO date "YYYY-MM-DD"
  gender?: string | null;     // "男性" / "女性" / "未指定"
  birthplace?: string | null;
}

export async function createPerson(
  slug: string,
  tenantId: string,
  input: PersonInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "名前は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  // 空文字 → null 正規化。trim も同時に行う。
  const norm = (v: string | null | undefined) => {
    if (!v) return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  };

  const { error } = await supabase.from("ai_clone_person").insert({
    tenant_id: tenantId,
    name,
    company_name: norm(input.company_name),
    position: norm(input.position),
    relationship: norm(input.relationship),
    importance: norm(input.importance),
    temperature: norm(input.temperature),
    referred_by: norm(input.referred_by),
    challenges: norm(input.challenges),
    caveats: norm(input.caveats),
    next_action: norm(input.next_action),
    birthday: norm(input.birthday),
    gender: norm(input.gender),
    birthplace: norm(input.birthplace),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people`);
  return { ok: true };
}

// 既存人物の更新。RLS で tenant member 判定 + 行所有テナント判定が走る。
export async function updatePerson(
  slug: string,
  tenantId: string,
  personId: string,
  input: PersonInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "名前は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const norm = (v: string | null | undefined) => {
    if (!v) return null;
    const t = v.trim();
    return t.length === 0 ? null : t;
  };

  const { error } = await supabase
    .from("ai_clone_person")
    .update({
      name,
      company_name: norm(input.company_name),
      position: norm(input.position),
      relationship: norm(input.relationship),
      importance: norm(input.importance),
      temperature: norm(input.temperature),
      referred_by: norm(input.referred_by),
      challenges: norm(input.challenges),
      caveats: norm(input.caveats),
      next_action: norm(input.next_action),
      birthday: norm(input.birthday),
      gender: norm(input.gender),
      birthplace: norm(input.birthplace),
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people`);
  revalidatePath(`/clone/${slug}/people/${personId}`);
  return { ok: true };
}

// ── Quick Edit（inline 編集） ──────────────────────────────
// 詳細ページ上部の Quick Edit パネル専用。許可フィールドだけを部分更新する。
// 全フィールド更新（updatePerson）と分けることで、誤クリックで他カラムを
// うっかり空にする事故を防ぐ。
const QUICK_EDITABLE_FIELDS = [
  "importance",
  "temperature",
  "relationship",
  "next_action",
] as const;
export type QuickEditableField = (typeof QUICK_EDITABLE_FIELDS)[number];

function isQuickEditableField(v: string): v is QuickEditableField {
  return (QUICK_EDITABLE_FIELDS as readonly string[]).includes(v);
}

export async function updatePersonField(
  slug: string,
  tenantId: string,
  personId: string,
  field: string,
  rawValue: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isQuickEditableField(field)) {
    return { ok: false, error: `フィールド「${field}」は inline 編集できません` };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const trimmed = rawValue.trim();
  const value: string | null = trimmed.length === 0 ? null : trimmed;

  const { error } = await supabase
    .from("ai_clone_person")
    .update({
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `保存に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people`);
  revalidatePath(`/clone/${slug}/people/${personId}`);
  return { ok: true };
}

// 削除（CASCADE で person_note / 各種リンクテーブルも削除される）。
export async function deletePerson(
  slug: string,
  tenantId: string,
  personId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_person")
    .delete()
    .eq("id", personId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/people`);
  return { ok: true };
}
