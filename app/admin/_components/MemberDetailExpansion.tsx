"use client";

// 全会員タブの詳細展開エリア。
// MembersTab の各行を開いた時に表示される。
//
// セクション構成:
//   1. プロフィール詳細（連絡先・呼び名・ヘッドライン）+ 完成度バー
//   2. アクティビティ（登録日・最終申込日・参加履歴）
//   3. Stripe / Subscription（customer dashboard リンク、status、portal 発行）
//   4. 管理者メモ（applicants.admin_notes 編集）
//   5. 主催者操作（手動 tier 上書き → /api/admin/tier）

import { useMemo, useState } from "react";
import {
  Mail,
  Calendar,
  CreditCard,
  ExternalLink,
  Link2,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tierStyle, type Tier } from "./EditorialChrome";
import { formatDate, formatDateTime } from "./EditorialFormat";
import { completenessColorClass } from "@/lib/profile-completeness";
import type { MemberRow } from "./MembersTab";

interface MemberDetailExpansionProps {
  member: MemberRow;
  // 行レベルの楽観的更新用。tier 変更・memo 保存後にこれ経由で MembersTab 側を更新する。
  onUpdate: (patch: Partial<MemberRow>) => void;
}

// Subscription status の表示スタイル。Stripe の status をそのまま反映している。
const subStatusStyle: Record<
  string,
  { label: string; tone: "ok" | "warn" | "danger" | "neutral" }
> = {
  active: { label: "Active", tone: "ok" },
  trialing: { label: "Trialing", tone: "ok" },
  past_due: { label: "Past due", tone: "warn" },
  unpaid: { label: "Unpaid", tone: "danger" },
  canceled: { label: "Canceled", tone: "neutral" },
  incomplete: { label: "Incomplete", tone: "warn" },
  incomplete_expired: { label: "Expired", tone: "neutral" },
  paused: { label: "Paused", tone: "warn" },
};

function SubscriptionBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold bg-gray-50 border-gray-200 text-gray-500">
        未契約
      </span>
    );
  }
  const meta = subStatusStyle[status] ?? {
    label: status,
    tone: "neutral" as const,
  };
  const toneClass =
    meta.tone === "ok"
      ? "bg-[#e9efe9] border-[#c5d3c8] text-[#3d6651]"
      : meta.tone === "warn"
        ? "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]"
        : meta.tone === "danger"
          ? "bg-[#f3e9e6] border-[#d8c4be] text-[#8a4538]"
          : "bg-gray-50 border-gray-200 text-gray-500";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${toneClass}`}
    >
      {meta.label}
    </span>
  );
}

export function MemberDetailExpansion({
  member,
  onUpdate,
}: MemberDetailExpansionProps) {
  const supabase = useMemo(() => createClient(), []);

  // メモ編集
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string>(member.admin_notes ?? "");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  // tier 上書き
  const [tierEditing, setTierEditing] = useState(false);
  const [tierDraft, setTierDraft] = useState<Tier>(member.tier);
  const [tierReason, setTierReason] = useState<string>("");
  const [tierSaving, setTierSaving] = useState(false);
  const [tierError, setTierError] = useState<string | null>(null);

  // Portal URL 発行
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalCopied, setPortalCopied] = useState(false);

  const completenessTone = completenessColorClass(member.completeness);
  const customerDashboardUrl = member.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${member.stripe_customer_id}`
    : null;

  // メモ保存
  const handleSaveNotes = async () => {
    setNotesSaving(true);
    setNotesError(null);
    const newValue = notesDraft.trim().length > 0 ? notesDraft : null;
    const { error } = await supabase
      .from("applicants")
      .update({ admin_notes: newValue })
      .eq("id", member.id);
    if (error) {
      setNotesError(`保存失敗：${error.message}`);
      setNotesSaving(false);
      return;
    }
    onUpdate({ admin_notes: newValue });
    setNotesEditing(false);
    setNotesSaving(false);
  };

  // tier 上書き（API 経由 → activity_log に記録）
  const handleSaveTier = async () => {
    if (tierDraft === member.tier) {
      setTierEditing(false);
      return;
    }
    setTierSaving(true);
    setTierError(null);
    const res = await fetch("/api/admin/tier", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        applicantId: member.id,
        tier: tierDraft,
        reason: tierReason.trim().length > 0 ? tierReason : null,
      }),
    });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setTierError(error ?? "tier 変更に失敗しました");
      setTierSaving(false);
      return;
    }
    onUpdate({ tier: tierDraft });
    setTierEditing(false);
    setTierReason("");
    setTierSaving(false);
  };

  // Portal URL を発行
  const handleIssuePortal = async () => {
    setPortalLoading(true);
    setPortalError(null);
    setPortalUrl(null);
    setPortalCopied(false);
    const res = await fetch("/api/admin/stripe/portal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicantId: member.id }),
    });
    if (!res.ok) {
      const { error } = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      setPortalError(error ?? "Portal URL の発行に失敗しました");
      setPortalLoading(false);
      return;
    }
    const { url } = (await res.json()) as { url: string };
    setPortalUrl(url);
    setPortalLoading(false);
  };

  return (
    <div className="space-y-5 text-sm">
      {/* 1. プロフィール詳細 + 完成度 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold">
            Profile
          </span>
          <CompletenessBar percent={member.completeness} tone={completenessTone} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {member.email && (
            <Field icon={<Mail className="w-4 h-4 text-gray-400" />}>
              <span className="break-all">{member.email}</span>
            </Field>
          )}
          {member.nickname && (
            <Field label="NICKNAME">{member.nickname}</Field>
          )}
          {member.job_title && <Field label="JOB">{member.job_title}</Field>}
          {member.headline && (
            <Field label="HEADLINE" wide>
              {member.headline}
            </Field>
          )}
          {!member.nickname &&
            !member.job_title &&
            !member.headline &&
            !member.email && (
              <span className="text-gray-400 italic">
                プロフィール未入力
              </span>
            )}
        </div>
      </section>

      {/* 2. アクティビティ */}
      <section>
        <div className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold mb-2">
          Activity
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Field icon={<Calendar className="w-4 h-4 text-gray-400" />}>
            <span className="text-gray-500 mr-1">登録:</span>
            <span>{formatDate(member.created_at)}</span>
          </Field>
          <Field icon={<Calendar className="w-4 h-4 text-gray-400" />}>
            <span className="text-gray-500 mr-1">最終申込:</span>
            <span>
              {member.last_applied_at
                ? formatDateTime(member.last_applied_at)
                : "—"}
            </span>
          </Field>
          <Field>
            <span className="text-gray-500 mr-1">参加実績:</span>
            <span className="tabular-nums">
              {member.attended_count} 回 / 申込 {member.applied_count}
            </span>
          </Field>
        </div>
      </section>

      {/* 3. Stripe / Subscription */}
      <section className="bg-white border border-gray-200 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#1c3550]" />
            <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold">
              Stripe
            </span>
            <SubscriptionBadge status={member.subscription_status} />
          </div>
          {customerDashboardUrl && (
            <a
              href={customerDashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#1c3550] hover:text-[#c08a3e] font-semibold"
            >
              Stripe Dashboard
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {!member.stripe_customer_id ? (
          <p className="text-xs text-gray-400 italic">
            Stripe Customer は未作成（未課金）
          </p>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-gray-500">
              <span className="text-[10px] tracking-[0.2em] text-gray-400 uppercase mr-2">
                Customer
              </span>
              <span className="font-mono">{member.stripe_customer_id}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleIssuePortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-bold text-[#1c3550] hover:border-[#c08a3e] hover:text-[#8a5a1c] disabled:opacity-50"
              >
                {portalLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Link2 className="w-3 h-3" />
                )}
                Customer Portal URL を発行
              </button>
              {portalUrl && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(portalUrl);
                      setPortalCopied(true);
                      setTimeout(() => setPortalCopied(false), 2000);
                    } catch {
                      // クリップボード失敗時は静かに無視
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    portalCopied
                      ? "bg-[#3d6651] text-white"
                      : "bg-[#1c3550] text-white hover:bg-[#102032]"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {portalCopied ? "コピーしました" : "URL をコピー"}
                </button>
              )}
            </div>

            {portalUrl && (
              <p className="text-[11px] text-gray-500 break-all">
                {portalUrl}
                <span className="block text-[10px] text-gray-400 mt-0.5">
                  ※ 短時間で失効します。発行直後に LINE/メールで送ってください
                </span>
              </p>
            )}
            {portalError && (
              <p className="text-[11px] text-[#8a4538] flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {portalError}
              </p>
            )}
          </div>
        )}
      </section>

      {/* 4. 管理者メモ */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold">
            管理者メモ
          </span>
          {!notesEditing && (
            <button
              type="button"
              onClick={() => {
                setNotesDraft(member.admin_notes ?? "");
                setNotesEditing(true);
                setNotesError(null);
              }}
              className="text-xs text-[#c08a3e] hover:text-[#8a5a1c] font-semibold"
            >
              編集
            </button>
          )}
        </div>
        {notesEditing ? (
          <div className="space-y-2">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={3}
              placeholder="この会員についてのメモ（属性・優先度・対応履歴など）"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={notesSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c3550] text-white rounded-md text-xs font-bold hover:bg-[#102032] disabled:opacity-50"
              >
                {notesSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                保存
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotesEditing(false);
                  setNotesError(null);
                }}
                disabled={notesSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-bold hover:border-gray-300"
              >
                <X className="w-3 h-3" />
                キャンセル
              </button>
            </div>
            {notesError && (
              <p className="text-[11px] text-[#8a4538]">{notesError}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap min-h-[1.5rem]">
            {member.admin_notes || (
              <span className="text-gray-400 italic">（メモなし）</span>
            )}
          </p>
        )}
      </section>

      {/* 5. 主催者操作：手動 tier 上書き */}
      <section className="bg-[#fdfaf3] border border-[#e6d3a3] rounded-md p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#8a5a1c]" />
            <span className="text-[10px] tracking-[0.25em] text-[#8a5a1c] uppercase font-semibold">
              主催者操作
            </span>
          </div>
          {!tierEditing && (
            <button
              type="button"
              onClick={() => {
                setTierDraft(member.tier);
                setTierReason("");
                setTierEditing(true);
                setTierError(null);
              }}
              className="text-xs text-[#8a5a1c] hover:text-[#c08a3e] font-semibold"
            >
              tier を変更
            </button>
          )}
        </div>

        {tierEditing ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-600">変更先:</span>
              {(["tentative", "registered", "paid"] as Tier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierDraft(t)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors ${
                    tierDraft === t
                      ? `${tierStyle[t].bg} ${tierStyle[t].border} ${tierStyle[t].text}`
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${tierStyle[t].dotBg}`}
                  />
                  {tierStyle[t].label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={tierReason}
              onChange={(e) => setTierReason(e.target.value)}
              placeholder="変更理由（任意・履歴に残ります）"
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveTier}
                disabled={tierSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1c3550] text-white rounded-md text-xs font-bold hover:bg-[#102032] disabled:opacity-50"
              >
                {tierSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                変更を確定
              </button>
              <button
                type="button"
                onClick={() => {
                  setTierEditing(false);
                  setTierError(null);
                }}
                disabled={tierSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-bold hover:border-gray-300"
              >
                <X className="w-3 h-3" />
                キャンセル
              </button>
            </div>
            {tierError && (
              <p className="text-[11px] text-[#8a4538] flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                {tierError}
              </p>
            )}
            <p className="text-[10px] text-gray-500">
              ⚠️ Stripe サブスク状態とは独立して動きます。整合性に注意してください。
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-600">
            現在: <strong>{tierStyle[member.tier].label}</strong>{" "}
            <span className="text-gray-400">
              （変更は activity_log に記録されます）
            </span>
          </p>
        )}
      </section>
    </div>
  );
}

// 小さな情報ラベル付き行（icon または label）。
function Field({
  icon,
  label,
  wide = false,
  children,
}: {
  icon?: React.ReactNode;
  label?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-start gap-2 text-gray-700 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      {icon}
      {label && (
        <span className="text-[10px] tracking-[0.2em] text-gray-400 mt-0.5 uppercase">
          {label}
        </span>
      )}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

// プロフィール完成度バー。
function CompletenessBar({
  percent,
  tone,
}: {
  percent: number;
  tone: { text: string; bar: string; bg: string };
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-bold tabular-nums ${tone.text}`}>
        {percent}%
      </span>
      <div className={`w-24 h-1.5 rounded-full overflow-hidden ${tone.bg}`}>
        <div
          className={`h-full ${tone.bar} transition-all`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
