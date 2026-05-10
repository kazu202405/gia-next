"use client";

// アクティビティログタブ。
// 専用の audit_log テーブルはまだ持たないので、event_attendees の
// applied_at / approved_at / rejected_at / cancelled_at から擬似的に履歴を
// 組み立てる。
//
// 表示単位は「イベント1件」（申込・承認・却下・キャンセル）。
// approved_by が誰かを名前にひもづけるため、applicants から名前を引く。
//
// Phase 2 で audit_log を別テーブル化して「メモ編集・notes 更新」も拾えるようにする想定。

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  UserPlus,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialCard, formatDateTime } from "./EditorialChrome";

type ActivityKind = "applied" | "approved" | "rejected" | "cancelled";

interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  at: string;
  applicantName: string;
  seminarTitle: string | null;
  seminarDate: string | null;
  approverName: string | null; // approved の時のみ
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

      const { data, error: e1 } = await supabase
        .from("event_attendees")
        .select(
          `
          id, applied_at, approved_at, rejected_at, cancelled_at, approved_by,
          seminar:seminars(id, title, date),
          applicant:applicants!inner(id, name)
        `
        );

      if (cancelled) return;
      if (e1) {
        setError(e1.message);
        setLoading(false);
        return;
      }

      // approved_by の名前を引くために applicants も別取得（map）
      const approverIds = new Set<string>();
      (data ?? []).forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        const aid = row.approved_by as string | null;
        if (aid) approverIds.add(aid);
      });

      let approverMap = new Map<string, string>();
      if (approverIds.size > 0) {
        const { data: approvers } = await supabase
          .from("applicants")
          .select("id, name")
          .in("id", Array.from(approverIds));
        approverMap = new Map(
          (approvers ?? []).map(
            (a: { id: string; name: string }) => [a.id, a.name] as const
          )
        );
      }

      const list: ActivityEvent[] = [];
      (data ?? []).forEach((r: unknown) => {
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
          ? approverMap.get(approverId) ?? null
          : null;

        const appliedAt = row.applied_at as string | null;
        const approvedAt = row.approved_at as string | null;
        const rejectedAt = row.rejected_at as string | null;
        const cancelledAt = row.cancelled_at as string | null;

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
          });
        };
        push("applied", appliedAt);
        push("approved", approvedAt);
        push("rejected", rejectedAt);
        push("cancelled", cancelledAt);
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
        {(["all", "applied", "approved", "rejected", "cancelled"] as const).map(
          (k) => (
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
          )
        )}
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
                      </div>
                      <div className="flex items-baseline gap-2 mt-0.5 text-[11px] text-gray-400">
                        <span>{formatDateTime(e.at)}</span>
                        {e.approverName && (
                          <span>承認者: {e.approverName}</span>
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
