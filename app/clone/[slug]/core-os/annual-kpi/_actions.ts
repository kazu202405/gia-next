// /clone/[slug]/core-os/annual-kpi の Server Actions。03_今年のKPI。年度別 CRUD。

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface AnnualKpiInput {
  fiscal_year: string; // not null
  yearly_theme?: string | null;
  revenue_target?: string | null;
  mrr_target?: string | null;
  meeting_target?: string | null;
  post_target?: string | null;
  seminar_target?: string | null;
  deal_target?: string | null;
}

const norm = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
};

const parseNum = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const t = v.trim();
  if (t.length === 0) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const parseInt2 = (v: string | null | undefined): number | null => {
  const n = parseNum(v);
  return n === null ? null : Math.round(n);
};

export async function createAnnualKpi(
  slug: string,
  tenantId: string,
  input: AnnualKpiInput,
): Promise<{ ok: boolean; error?: string }> {
  const fiscalYear = input.fiscal_year?.trim() ?? "";
  if (fiscalYear.length === 0) {
    return { ok: false, error: "年度は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("ai_clone_annual_kpi").insert({
    tenant_id: tenantId,
    fiscal_year: fiscalYear,
    yearly_theme: norm(input.yearly_theme),
    revenue_target: parseNum(input.revenue_target),
    mrr_target: parseNum(input.mrr_target),
    meeting_target: parseInt2(input.meeting_target),
    post_target: parseInt2(input.post_target),
    seminar_target: parseInt2(input.seminar_target),
    deal_target: parseInt2(input.deal_target),
  });

  if (error) {
    return { ok: false, error: `登録に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/annual-kpi`);
  return { ok: true };
}

export async function updateAnnualKpi(
  slug: string,
  tenantId: string,
  kpiId: string,
  input: AnnualKpiInput,
): Promise<{ ok: boolean; error?: string }> {
  const fiscalYear = input.fiscal_year?.trim() ?? "";
  if (fiscalYear.length === 0) {
    return { ok: false, error: "年度は必須です" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_annual_kpi")
    .update({
      fiscal_year: fiscalYear,
      yearly_theme: norm(input.yearly_theme),
      revenue_target: parseNum(input.revenue_target),
      mrr_target: parseNum(input.mrr_target),
      meeting_target: parseInt2(input.meeting_target),
      post_target: parseInt2(input.post_target),
      seminar_target: parseInt2(input.seminar_target),
      deal_target: parseInt2(input.deal_target),
      updated_at: new Date().toISOString(),
    })
    .eq("id", kpiId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `更新に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/annual-kpi`);
  return { ok: true };
}

export async function deleteAnnualKpi(
  slug: string,
  tenantId: string,
  kpiId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "ログインが必要です" };
  }

  const { error } = await supabase
    .from("ai_clone_annual_kpi")
    .delete()
    .eq("id", kpiId)
    .eq("tenant_id", tenantId);

  if (error) {
    return { ok: false, error: `削除に失敗しました：${error.message}` };
  }

  revalidatePath(`/clone/${slug}/core-os/annual-kpi`);
  return { ok: true };
}
