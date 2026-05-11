// /clone/[slug]/services の Server Actions。
// テナント member 判定は ai_clone_service への RLS が自動実行する。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ServiceInput {
  name: string;
  target_audience?: string | null;
  problem_solved?: string | null;
  offering?: string | null;
  pricing?: string | null;
  onboarding_flow?: string | null;
  faq_text?: string | null;
  good_fit?: string | null;
  bad_fit?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

export async function createService(
  slug: string,
  tenantId: string,
  input: ServiceInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "サービス名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_service").insert({
    tenant_id: tenantId,
    name,
    target_audience: norm(input.target_audience),
    problem_solved: norm(input.problem_solved),
    offering: norm(input.offering),
    pricing: norm(input.pricing),
    onboarding_flow: norm(input.onboarding_flow),
    faq_text: norm(input.faq_text),
    good_fit: norm(input.good_fit),
    bad_fit: norm(input.bad_fit),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/services`);
  return { ok: true };
}

export async function updateService(
  slug: string,
  tenantId: string,
  serviceId: string,
  input: ServiceInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name?.trim() ?? "";
  if (name.length === 0) {
    return { ok: false, error: "サービス名は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_service")
    .update({
      name,
      target_audience: norm(input.target_audience),
      problem_solved: norm(input.problem_solved),
      offering: norm(input.offering),
      pricing: norm(input.pricing),
      onboarding_flow: norm(input.onboarding_flow),
      faq_text: norm(input.faq_text),
      good_fit: norm(input.good_fit),
      bad_fit: norm(input.bad_fit),
      updated_at: new Date().toISOString(),
    })
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/services`);
  revalidatePath(`/clone/${slug}/services/${serviceId}`);
  return { ok: true };
}

export async function deleteService(
  slug: string,
  tenantId: string,
  serviceId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_service")
    .delete()
    .eq("id", serviceId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/services`);
  return { ok: true };
}
