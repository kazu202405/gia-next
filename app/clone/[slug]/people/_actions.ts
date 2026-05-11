// /clone/[slug]/people の Server Actions。
// テナント member 判定は ai_clone_person への RLS（ai_clone_is_tenant_member(tenant_id)）が
// 自動で実行する。サーバ側ではフィールドの whitelist 化と name の必須チェックだけ持つ。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 追加フォームから受け取るフィールド。型と必須/任意の明示。
// ai_clone_person の DB スキーマと 1:1（trust_level / interests / referred_to は今回 UI に出さないので除外）。
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
