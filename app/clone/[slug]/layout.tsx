// AI Clone マルチテナント書込UI のレイアウト。
// /clone/[slug]/* 配下は loadTenantOr404 でゲートする。
// テナント member でなければ 404 を返す（存在を漏らさない）。
//
// 設計メモ:
//   * Editorial デザインは admin と同系統（Navy + Gold + Noto Serif JP）
//   * /admin と異なる "AI CLONE / {tenant.name}" 系のヘッダを CloneChrome で出す

import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { CloneChrome } from "./_components/CloneChrome";

export const dynamic = "force-dynamic";

export default async function CloneLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant, role } = await loadTenantOr404(slug);

  return (
    <CloneChrome tenant={tenant} role={role}>
      {children}
    </CloneChrome>
  );
}
