// /clone/[slug]/settings ─ テナント設定（表示名 / slug / プラン情報）。
// owner / admin のみ編集可。member / viewer は read-only。
// メンバー管理（招待・role変更）は Phase 3 で別タブとして追加予定。

import {
  EditorialHeader,
} from "@/app/admin/_components/EditorialChrome";
import { loadTenantOr404 } from "@/lib/ai-clone/tenant";
import { TenantSettingsForm } from "./_components/TenantSettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tenant, role } = await loadTenantOr404(slug);

  const canEdit = role === "owner" || role === "admin";

  return (
    <div className="px-5 sm:px-6 py-6 space-y-6 max-w-3xl">
      <EditorialHeader
        eyebrow="SETTINGS"
        title="テナント設定"
        description="表示名 / URL（slug）/ 契約プラン。メンバー管理は Phase 3 で追加予定。"
      />

      <TenantSettingsForm
        tenantId={tenant.id}
        currentSlug={tenant.slug}
        currentName={tenant.name}
        currentPlan={tenant.plan}
        canEdit={canEdit}
        role={role}
      />
    </div>
  );
}
