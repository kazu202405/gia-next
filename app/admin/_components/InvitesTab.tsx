"use client";

// 招待コード管理タブ。
// 現状の DB スキーマでは「invitations」専用テーブルは存在せず、
// event_attendees.invite_code フィールド（?invite=xxx で来た時の値）だけが正本。
//
// このタブでは:
//   1. 既存の invite_code を集計（誰が、どの会に、何人を呼んだか）
//   2. mock first 段階として、新規発行 UI は配置するが永続化はしない
//      → Phase 2 で invitations テーブル（lib/invitations.ts mock を昇格）を
//        Supabase に追加してから本実装する旨を画面上に明示する。
//
// 表示単位は「招待コード」。1コードあたりの利用件数 / 紐づく申請者一覧を出す。

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, Send, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  EditorialCard,
  StatusBadge,
  AdmissionStatus,
} from "./EditorialChrome";
import { formatDate } from "./EditorialFormat";

interface InviteUsage {
  code: string;
  totalUsed: number;
  attendees: {
    id: string;
    applicantName: string;
    seminarTitle: string | null;
    seminarDate: string | null;
    status: AdmissionStatus;
    appliedAt: string;
  }[];
  firstUsedAt: string;
  lastUsedAt: string;
}

export function InvitesTab() {
  const supabase = useMemo(() => createClient(), []);

  const [usages, setUsages] = useState<InviteUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      const { data, error: e1 } = await supabase
        .from("event_attendees")
        .select(
          `
          id, status, applied_at, invite_code,
          seminar:seminars(id, title, date),
          applicant:applicants!inner(id, name)
        `
        )
        .not("invite_code", "is", null)
        .order("applied_at", { ascending: false });

      if (cancelled) return;
      if (e1) {
        setError(e1.message);
        setLoading(false);
        return;
      }

      const byCode = new Map<string, InviteUsage>();
      (data ?? []).forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        const code = (row.invite_code as string | null)?.trim();
        if (!code) return;
        const seminar = Array.isArray(row.seminar)
          ? (row.seminar[0] ?? null)
          : (row.seminar ?? null);
        const applicant = Array.isArray(row.applicant)
          ? (row.applicant[0] ?? null)
          : (row.applicant ?? null);
        const appliedAt = row.applied_at as string;

        const cur = byCode.get(code) ?? {
          code,
          totalUsed: 0,
          attendees: [],
          firstUsedAt: appliedAt,
          lastUsedAt: appliedAt,
        };

        cur.totalUsed += 1;
        cur.attendees.push({
          id: row.id as string,
          applicantName:
            (applicant as { name?: string } | null)?.name ?? "（名前なし）",
          seminarTitle:
            (seminar as { title?: string } | null)?.title ?? null,
          seminarDate:
            (seminar as { date?: string } | null)?.date ?? null,
          status: row.status as AdmissionStatus,
          appliedAt,
        });
        if (appliedAt < cur.firstUsedAt) cur.firstUsedAt = appliedAt;
        if (appliedAt > cur.lastUsedAt) cur.lastUsedAt = appliedAt;

        byCode.set(code, cur);
      });

      const list = Array.from(byCode.values()).sort(
        (a, b) => b.totalUsed - a.totalUsed
      );
      setUsages(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const filtered = usages.filter((u) =>
    search.trim().length === 0 ? true : u.code.includes(search.trim())
  );

  const handleCopy = async (code: string) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join?invite=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      // クリップボードAPIが使えない環境では何もしない
    }
  };

  return (
    <div>
      {/* Phase 2 への注記 */}
      <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#e6d3a3] bg-[#fbf3e3] text-[#8a5a1c] text-sm">
        <Send className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold">招待コード — 現状の見え方</p>
          <p className="mt-0.5 text-xs leading-relaxed">
            実際に <code>?invite=xxx</code> 経由で申し込まれたコードのみ集計しています。
            <br />
            「事前発行・割当・無効化」を主催者UIから行うには、
            <code> invitations </code>
            テーブルの追加（Phase 2）が必要です。
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">取得エラー</p>
            <p className="mt-0.5 text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* 検索 */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="招待コードで絞り込み..."
          className="w-full max-w-sm px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
        />
      </div>

      {loading && (
        <EditorialCard className="text-center py-16">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </EditorialCard>
      )}

      {!loading && (
        <div className="space-y-3">
          {filtered.length === 0 && !error && (
            <EditorialCard className="text-center py-16">
              <p className="text-sm text-gray-400">
                招待コード経由の申込はまだありません
              </p>
            </EditorialCard>
          )}

          {filtered.map((u) => {
            const isExpanded = expandedCode === u.code;
            const isCopied = copiedCode === u.code;
            return (
              <EditorialCard key={u.code} variant="row" className="overflow-hidden">
                <div className="flex items-center gap-3 p-4 sm:p-5">
                  <button
                    onClick={() =>
                      setExpandedCode(isExpanded ? null : u.code)
                    }
                    className="flex-1 min-w-0 flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                  >
                    <span className="text-[10px] tracking-[0.25em] text-[#c08a3e] font-semibold flex-shrink-0">
                      INVITE
                    </span>
                    <span className="font-mono text-sm font-bold text-[#1c3550] truncate">
                      {u.code}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {u.totalUsed}件 利用 / 最終: {formatDate(u.lastUsedAt)}
                    </span>
                  </button>
                  <button
                    onClick={() => handleCopy(u.code)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 hover:text-[#1c3550] hover:bg-gray-100 flex-shrink-0"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-[#3d6651]" />
                        <span className="text-[#3d6651]">コピー済</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        URL
                      </>
                    )}
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 sm:px-5 py-4 bg-gray-50/40">
                    <span className="text-[10px] tracking-[0.25em] text-gray-500 uppercase font-semibold block mb-3">
                      この招待で申込のあった人
                    </span>
                    <ul className="space-y-2">
                      {u.attendees.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center gap-3 text-sm"
                        >
                          <span className="text-[#1c3550] font-semibold">
                            {a.applicantName}
                          </span>
                          <StatusBadge status={a.status} />
                          <span className="text-xs text-gray-500 truncate">
                            {a.seminarDate ? formatDate(a.seminarDate) : "—"}
                            {a.seminarTitle ? `　${a.seminarTitle}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </EditorialCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
