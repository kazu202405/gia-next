// /clone/[slug]/core-os/decision-principles の Server Actions。04_判断基準。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface DecisionPrincipleInput {
  name: string;
  category?: string | null;
  rule?: string | null;
  reason?: string | null;
  priority?: string | null; // 高/中/低
  exception?: string | null;
  related_values?: string | null; // 自由入力 → text[]
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const parseTags = (v: string | null | undefined): string[] | null => {
  if (!v) return null;
  const parts = v
    .split(/[,、\/\n\r　]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : null;
};

export async function createDecisionPrinciple(
  slug: string,
  tenantId: string,
  input: DecisionPrincipleInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "判断名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_decision_principle").insert({
    tenant_id: tenantId,
    name,
    category: norm(input.category),
    rule: norm(input.rule),
    reason: norm(input.reason),
    priority: norm(input.priority),
    exception: norm(input.exception),
    related_values: parseTags(input.related_values),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/decision-principles`);
  return { ok: true };
}
