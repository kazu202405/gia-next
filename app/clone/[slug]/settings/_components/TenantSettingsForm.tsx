"use client";

// テナント設定フォーム。表示名と slug を別カードで編集する。
// slug 変更後は新しい URL の同ページにリダイレクト。
// 編集不可ロール（member / viewer）は read-only 表示。

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { updateTenantName, updateTenantSlug } from "../_actions";

interface Props {
  tenantId: string;
  currentSlug: string;
  currentName: string;
  currentPlan: string | null;
  canEdit: boolean;
  role: string;
}

const labelClass =
  "block text-xs font-bold text-gray-700 tracking-wider mb-1.5";
const inputClass =
  "block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-[#1c3550] focus:ring-1 focus:ring-[#1c3550]/10 disabled:bg-gray-50 disabled:text-gray-500";
const helperClass = "text-[11px] text-gray-500 mt-1.5 leading-relaxed";
const errorBox =
  "flex items-start gap-2 px-3 py-2 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[12px] text-[#8a4538]";
const successBox =
  "flex items-start gap-2 px-3 py-2 rounded-md border border-[#c5d3c8] bg-[#e9efe9] text-[12px] text-[#3d6651]";

function CardShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6 space-y-4">
      <header>
        <h3 className="font-serif text-base font-semibold text-[#1c3550] tracking-[0.06em]">
          {title}
        </h3>
        <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

function NameCard({
  tenantId,
  currentSlug,
  currentName,
  canEdit,
}: {
  tenantId: string;
  currentSlug: string;
  currentName: string;
  canEdit: boolean;
}) {
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty = name.trim() !== currentName && name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await updateTenantName(currentSlug, tenantId, name);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      setSuccess(true);
    });
  };

  return (
    <CardShell
      title="表示名"
      description="ヘッダー左上に表示されるテナント名（クライアント名・自分の名前など）。"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="tenant-name">
            表示名
          </label>
          <input
            id="tenant-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
              setSuccess(false);
            }}
            disabled={!canEdit || pending}
            maxLength={50}
            className={inputClass}
          />
          <p className={helperClass}>
            最大50文字。日本語可。{name.trim().length} / 50
          </p>
        </div>

        {error && (
          <div role="alert" className={errorBox}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className={successBox}>
            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>表示名を更新しました</span>
          </div>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending || !dirty}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              表示名を保存
            </button>
          </div>
        )}
      </form>
    </CardShell>
  );
}

function SlugCard({
  tenantId,
  currentSlug,
  canEdit,
}: {
  tenantId: string;
  currentSlug: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(currentSlug);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const normalized = slug.trim().toLowerCase();
  const dirty = normalized !== currentSlug && normalized.length > 0;
  // クライアント側の即時バリデーション（送信前のヒント表示）
  const formatOk = /^[a-z0-9-]{3,20}$/.test(normalized);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateTenantSlug(currentSlug, tenantId, normalized);
      if (!res.ok) {
        setError(res.error ?? "更新に失敗しました");
        return;
      }
      // 新 slug の同じページへ移動（旧 URL は404になる）
      const next = res.newSlug ?? normalized;
      router.replace(`/clone/${next}/settings`);
      router.refresh();
    });
  };

  return (
    <CardShell
      title="URL（slug）"
      description="ブラウザURLの /clone/<ここ> に使う識別子。半角英小文字・数字・ハイフン。"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="tenant-slug">
            slug
          </label>
          <div className="flex items-center gap-1">
            <span className="text-[12px] text-gray-400 select-none whitespace-nowrap font-mono">
              /clone/
            </span>
            <input
              id="tenant-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setError(null);
              }}
              disabled={!canEdit || pending}
              maxLength={20}
              autoComplete="off"
              spellCheck={false}
              className={inputClass + " font-mono"}
            />
          </div>
          <p className={helperClass}>
            英小文字 / 数字 / ハイフン、3〜20文字。
            予約語（admin / login / clone / members 等）は使えません。
          </p>
          {dirty && !formatOk && (
            <p className="text-[11px] text-[#8a4538] mt-1.5">
              形式が不正です（小文字英数字とハイフン、3〜20文字）
            </p>
          )}
        </div>

        {dirty && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-[#e6d3a3] bg-[#fbf3e3] text-[11px] text-[#8a5a1c] leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold mb-0.5">URLが変わります</p>
              <p>
                変更前 <code className="font-mono">/clone/{currentSlug}</code> へのブックマーク・共有リンクは
                404 になります。社内共有しているURLがある場合は事前に告知してください。
              </p>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className={errorBox}>
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending || !dirty || !formatOk}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#1c3550] text-white text-xs font-bold tracking-[0.06em] hover:bg-[#0f2238] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              slug を変更する
            </button>
          </div>
        )}
      </form>
    </CardShell>
  );
}

function PlanCard({ plan, role }: { plan: string | null; role: string }) {
  return (
    <CardShell
      title="契約プラン"
      description="プラン変更は別途お問い合わせください（営業 / Stripe 経由）。"
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
        <div>
          <dt className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-1">
            プラン
          </dt>
          <dd className="text-[#1c3550] font-medium">{plan ?? "未設定"}</dd>
        </div>
        <div>
          <dt className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-1">
            あなたのロール
          </dt>
          <dd className="text-[#1c3550] font-medium tracking-[0.18em]">
            {role.toUpperCase()}
          </dd>
        </div>
      </dl>
    </CardShell>
  );
}

export function TenantSettingsForm({
  tenantId,
  currentSlug,
  currentName,
  currentPlan,
  canEdit,
  role,
}: Props) {
  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md border border-gray-200 bg-gray-50 text-[12px] text-gray-600">
          <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            あなたのロール（{role}）では編集できません。owner / admin のみ変更可能です。
          </span>
        </div>
      )}

      <NameCard
        tenantId={tenantId}
        currentSlug={currentSlug}
        currentName={currentName}
        canEdit={canEdit}
      />
      <SlugCard
        tenantId={tenantId}
        currentSlug={currentSlug}
        canEdit={canEdit}
      />
      <PlanCard plan={currentPlan} role={role} />
    </div>
  );
}
