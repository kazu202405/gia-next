"use client";

// アクティビティログタブ。
//
// 2系統のソースを統合タイムラインで表示する：
//   1. event_attendees の applied_at / approved_at / rejected_at / cancelled_at
//      （申込・承認・却下・キャンセル）
//   2. activity_log テーブル（2026-05-11 0012 で新設）
//      ─ tier 変更などの「申請に紐付かない主催者操作」
//
// 表示は「アクティビティ1件」単位。各イベントに actor / 対象会員 /
// 詳細（tier 変更なら old→new、reason）を持たせる。

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  UserPlus,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowRightLeft,
  StickyNote,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialCard, tierStyle, type Tier } from "./EditorialChrome";
import { formatDateTime } from "./EditorialFormat";

type ActivityKind =
  | "applied"
  | "approved"
  | "rejected"
  | "cancelled"
  | "tier_change"
  | "admin_notes_update";

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string;
  applicantName: string;
  // セミナー関連（applied/approved/rejected/cancelled の時のみ）
  seminarTitle: string | null;
  seminarDate: string | null;
  approverName: string | null; // approved の時のみ
  // activity_log 由来のイベント用
  actorName: string | null; // 実行者（主催者）
  tierChange: { from: Tier; to: Tier } | null;
  reason: string | null;
}

const kindStyle: Record<
  ActivityKind,
  {
    label: string;
    Icon: typeof UserPlus;
    color: string;
    bg: string;
    border: string;
  }
> = {
  applied: {
    label: "申込",
    Icon: UserPlus,
    color: "text-[#1c3550]",
    bg: "bg-[#f1f4f7]",
    border: "border-[#d6dde5]",
  },
  approved: {
    label: "承認",
    Icon: CheckCircle2,
    color: "text-[#3d6651]",
    bg: "bg-[#e9efe9]",
    border: "border-[#c5d3c8]",
  },
  rejected: {
    label: "却下",
    Icon: XCircle,
    color: "text-[#8a4538]",
    bg: "bg-[#f3e9e6]",
    border: "border-[#d8c4be]",
  },
  cancelled: {
    label: "キャンセル",
    Icon: Ban,
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
  tier_change: {
    label: "tier 変更",
    Icon: ArrowRightLeft,
    color: "text-[#8a5a1c]",
    bg: "bg-[#fbf3e3]",
    border: "border-[#e6d3a3]",
  },
  admin_notes_update: {
    label: "メモ更新",
    Icon: StickyNote,
    color: "text-[#1c3550]",
    bg: "bg-[#f1f4f7]",
    border: "border-[#d6dde5]",
  },
};

export function ActivityTab() {
  const supabase = useMemo(() => createClient(), []);

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityKind | "all">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      // 1) event_attendees から申込系イベント
      const [attendeesRes, logsRes] = await Promise.all([
        supabase
          .from("event_attendees")
          .select(
            `
            id, applied_at, approved_at, rejected_at, cancelled_at, approved_by,
            seminar:seminars(id, title, date),
            applicant:applicants!inner(id, name)
            `,
          ),
        supabase
          .from("activity_log")
          .select("id, actor_id, subject_type, subject_id, action, details, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;
      if (attendeesRes.error) {
        setError(attendeesRes.error.message);
        setLoading(false);
        return;
      }
      // activity_log は無くてもタブ自体は壊さない（マイグレーション未適用環境への配慮）
      if (logsRes.error) {
        console.warn(
          "[ActivityTab] activity_log 取得失敗（migration未適用？）:",
          logsRes.error.message,
        );
      }

      const data = attendeesRes.data ?? [];
      const logs = logsRes.data ?? [];

      // 関係する applicant id を集めて名前を一括取得（actor_name / subject_name 両方）
      const ids = new Set<string>();
      data.forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        const aid = row.approved_by as string | null;
        if (aid) ids.add(aid);
      });
      logs.forEach((l: Record<string, unknown>) => {
        const actor = l.actor_id as string | null;
        const subjectType = l.subject_type as string | null;
        const subjectId = l.subject_id as string | null;
        if (actor) ids.add(actor);
        if (subjectType === "applicant" && subjectId) ids.add(subjectId);
      });

      let nameMap = new Map<string, string>();
      if (ids.size > 0) {
        const { data: people } = await supabase
          .from("applicants")
          .select("id, name")
          .in("id", Array.from(ids));
        nameMap = new Map(
          (people ?? []).map(
            (p: { id: string; name: string }) => [p.id, p.name] as const,
          ),
        );
      }

      const list: ActivityEvent[] = [];

      // event_attendees → 申込系イベント
      data.forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        const id = row.id as string;
        const seminar = Array.isArray(row.seminar)
          ? (row.seminar[0] ?? null)
          : (row.seminar ?? null);
        const applicant = Array.isArray(row.applicant)
          ? (row.applicant[0] ?? null)
          : (row.applicant ?? null);
        const applicantName =
          (applicant as { name?: string } | null)?.name ?? "（名前なし）";
        const seminarTitle =
          (seminar as { title?: string } | null)?.title ?? null;
        const seminarDate =
          (seminar as { date?: string } | null)?.date ?? null;
        const approverId = row.approved_by as string | null;
        const approverName = approverId
          ? (nameMap.get(approverId) ?? null)
          : null;

        const push = (kind: ActivityKind, at: string | null) => {
          if (!at) return;
          list.push({
            id: `${id}-${kind}`,
            kind,
            at,
            applicantName,
            seminarTitle,
            seminarDate,
            approverName: kind === "approved" ? approverName : null,
            actorName: null,
            tierChange: null,
            reason: null,
          });
        };
        push("applied", row.applied_at as string | null);
        push("approved", row.approved_at as string | null);
        push("rejected", row.rejected_at as string | null);
        push("cancelled", row.cancelled_at as string | null);
      });

      // activity_log → tier 変更・メモ更新
      logs.forEach((l: Record<string, unknown>) => {
        const action = l.action as string;
        const subjectType = l.subject_type as string;
        const subjectId = l.subject_id as string;
        const actorId = l.actor_id as string | null;
        const details = (l.details as Record<string, unknown>) ?? {};
        const createdAt = l.created_at as string;

        if (subjectType !== "applicant") return;

        if (action === "tier_change") {
          list.push({
            id: `log-${l.id}`,
            kind: "tier_change",
            at: createdAt,
            applicantName: nameMap.get(subjectId) ?? "（名前なし）",
            seminarTitle: null,
            seminarDate: null,
            approverName: null,
            actorName: actorId ? (nameMap.get(actorId) ?? null) : null,
            tierChange: {
              from: (details.old_tier as Tier) ?? "tentative",
              to: (details.new_tier as Tier) ?? "tentative",
            },
            reason: (details.reason as string | null) ?? null,
          });
          return;
        }

        if (action === "admin_notes_update") {
          list.push({
            id: `log-${l.id}`,
            kind: "admin_notes_update",
            at: createdAt,
            applicantName: nameMap.get(subjectId) ?? "（名前なし）",
            seminarTitle: null,
            seminarDate: null,
            approverName: null,
            actorName: actorId ? (nameMap.get(actorId) ?? null) : null,
            tierChange: null,
            reason: null,
          });
          return;
        }
      });

      list.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
      setEvents(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = events.filter(
    (e) => filter === "all" || e.kind === filter
  );

  return (
    <div>
      {error && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">取得エラー</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            "all",
            "applied",
            "approved",
            "rejected",
            "cancelled",
            "tier_change",
            "admin_notes_update",
          ] as const
        ).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              filter === k
                ? "bg-[#1c3550] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {k === "all" ? "すべて" : kindStyle[k].label}
          </button>
        ))}
      </div>

      {loading && (
        <EditorialCard className="text-center py-16">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </EditorialCard>
      )}

      {!loading && (
        <EditorialCard>
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-gray-400">
                該当するアクティビティはありません
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((e) => {
                const s = kindStyle[e.kind];
                const Icon = s.Icon;
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 px-4 sm:px-5 py-3"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${s.bg} ${s.border}`}
                    >
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${s.color}`}>
                          {s.label}
                        </span>
                        <span className="text-sm text-[#1c3550] font-semibold">
                          {e.applicantName}
                        </span>
                        {e.seminarTitle && (
                          <span className="text-xs text-gray-500">
                            → {e.seminarTitle}
                          </span>
                        )}
                        {/* tier 変更: 旧→新 を pill で表示 */}
                        {e.tierChange && (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <TierPill tier={e.tierChange.from} />
                            <span className="text-gray-400">→</span>
                            <TierPill tier={e.tierChange.to} />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-gray-400">
                        <span>{formatDateTime(e.at)}</span>
                        {e.approverName && (
                          <span>承認者: {e.approverName}</span>
                        )}
                        {e.actorName && (
                          <span>主催者: {e.actorName}</span>
                        )}
                        {e.reason && (
                          <span className="text-gray-500">
                            理由: {e.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </EditorialCard>
      )}
    </div>
  );
}

// tier 表示用の小型 pill（タイムライン内で旧→新を示すため通常の TierBadge より細身）。
function TierPill({ tier }: { tier: Tier }) {
  const t = tierStyle[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${t.bg} ${t.border} ${t.text}`}
    >
      <span className={`w-1 h-1 rounded-full ${t.dotBg}`} />
      {t.label}
    </span>
  );
}
