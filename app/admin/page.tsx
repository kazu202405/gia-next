"use client";

// 入会申請管理ページ（Supabase 接続版）。
// /admin 配下に配置。認証ガードは middleware.ts で行う。
// データソース: event_attendees ← seminars / applicants を join
// 操作:
//   - 承認 (status='approved' + approved_at + approved_by を UPDATE)
//   - 却下 (status='rejected' + rejected_at を UPDATE)
//   - 楽観的更新（API 呼び出し前に local state を書き換え、失敗したら戻す）
//
// レイアウト枠（上部ヘッダー / 左サイドナビ）は app/admin/layout.tsx 側で持つ。

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  User,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ApplicationStatus = "pending" | "approved" | "rejected" | "cancelled";

// supabase select の戻り型に合わせた最低限の shape。
// Supabase クライアントの型生成は今回まだ行わないので、ここで局所的に定義する。
interface AttendeeRow {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  invite_code: string | null;
  notes: string | null;
  seminar: {
    id: string;
    slug: string;
    title: string;
    date: string;
    start_time: string | null;
    location: string | null;
  } | null;
  applicant: {
    id: string;
    name: string;
    name_furigana: string | null;
    nickname: string | null;
    email: string | null;
    referrer_name: string | null;
    referrer_id: string | null;
  } | null;
}

const statusConfig: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  pending: {
    label: "審査中",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  approved: {
    label: "承認済み",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    icon: CheckCircle,
  },
  rejected: {
    label: "却下",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
  },
  cancelled: {
    label: "キャンセル",
    color: "text-gray-500",
    bg: "bg-gray-50 border-gray-200",
    icon: XCircle,
  },
};

// 日付表示ユーティリティ（YYYY-MM-DD or 不明なら原文）
function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] =
    useState<ApplicationStatus | "all">("all");
  const [seminarFilter, setSeminarFilter] = useState<string>("all"); // "all" or seminar.id
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 初回ロード
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("event_attendees")
        .select(
          `
          id, status, applied_at, approved_at, rejected_at, invite_code, notes,
          seminar:seminars(id, slug, title, date, start_time, location),
          applicant:applicants!inner(id, name, name_furigana, nickname, email, referrer_name, referrer_id)
        `
        )
        .order("applied_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        setLoadError(error.message);
        setRows([]);
      } else {
        // supabase の型は seminar/applicant を配列で返すケースがあるため、
        // 単数リレーションでも安全に取り出せるよう正規化する。
        const normalized: AttendeeRow[] = (data ?? []).map((r: unknown) => {
          const row = r as Record<string, unknown>;
          const seminar = Array.isArray(row.seminar)
            ? (row.seminar[0] ?? null)
            : (row.seminar ?? null);
          const applicant = Array.isArray(row.applicant)
            ? (row.applicant[0] ?? null)
            : (row.applicant ?? null);
          return {
            id: row.id as string,
            status: row.status as ApplicationStatus,
            applied_at: row.applied_at as string,
            approved_at: (row.approved_at as string | null) ?? null,
            rejected_at: (row.rejected_at as string | null) ?? null,
            invite_code: (row.invite_code as string | null) ?? null,
            notes: (row.notes as string | null) ?? null,
            seminar: seminar as AttendeeRow["seminar"],
            applicant: applicant as AttendeeRow["applicant"],
          };
        });
        setRows(normalized);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // セミナー別の選択肢（rows から作る）
  const seminarOptions = useMemo(() => {
    const map = new Map<string, { id: string; title: string; date: string }>();
    rows.forEach((r) => {
      if (r.seminar) {
        map.set(r.seminar.id, {
          id: r.seminar.id,
          title: r.seminar.title,
          date: r.seminar.date,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : 0
    );
  }, [rows]);

  const filtered = rows.filter((r) => {
    const name = r.applicant?.name ?? "";
    const email = r.applicant?.email ?? "";
    const referrer = r.applicant?.referrer_name ?? "";
    const matchSearch =
      search.trim().length === 0 ||
      name.includes(search) ||
      email.includes(search) ||
      referrer.includes(search);
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchSeminar =
      seminarFilter === "all" || r.seminar?.id === seminarFilter;
    return matchSearch && matchStatus && matchSeminar;
  });

  const counts = useMemo(() => {
    return {
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    };
  }, [rows]);

  // 承認
  const handleApprove = async (attendeeId: string) => {
    setActionError(null);
    setBusyId(attendeeId);

    // 楽観的更新
    const prev = rows;
    const nowIso = new Date().toISOString();
    setRows((cur) =>
      cur.map((r) =>
        r.id === attendeeId
          ? { ...r, status: "approved", approved_at: nowIso }
          : r
      )
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("event_attendees")
      .update({
        status: "approved",
        approved_at: nowIso,
        approved_by: user?.id ?? null,
      })
      .eq("id", attendeeId);

    if (error) {
      // ロールバック
      setRows(prev);
      setActionError(`承認に失敗しました：${error.message}`);
    }
    setBusyId(null);
  };

  // 却下
  const handleReject = async (attendeeId: string) => {
    setActionError(null);
    setBusyId(attendeeId);

    const prev = rows;
    const nowIso = new Date().toISOString();
    setRows((cur) =>
      cur.map((r) =>
        r.id === attendeeId
          ? { ...r, status: "rejected", rejected_at: nowIso }
          : r
      )
    );

    const { error } = await supabase
      .from("event_attendees")
      .update({
        status: "rejected",
        rejected_at: nowIso,
      })
      .eq("id", attendeeId);

    if (error) {
      setRows(prev);
      setActionError(`却下に失敗しました：${error.message}`);
    }
    setBusyId(null);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* セクションヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">入会申請</h2>
              <p className="text-xs text-gray-500 mt-0.5">承認・却下の管理</p>
            </div>
            {counts.pending > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-bold">
                <Clock className="w-4 h-4" />
                {counts.pending}件の審査待ち
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ロードエラー */}
        {loadError && (
          <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">データ取得エラー</p>
              <p className="mt-0.5 text-xs">{loadError}</p>
            </div>
          </div>
        )}

        {/* アクションエラー（承認/却下失敗） */}
        {actionError && (
          <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* 統計カード */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "審査中",
              count: counts.pending,
              color: "text-amber-600",
              bg: "bg-amber-50",
              icon: Clock,
            },
            {
              label: "承認済み",
              count: counts.approved,
              color: "text-green-600",
              bg: "bg-green-50",
              icon: UserCheck,
            },
            {
              label: "却下",
              count: counts.rejected,
              color: "text-red-600",
              bg: "bg-red-50",
              icon: UserX,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div
                className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* 検索・フィルター */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前・メール・紹介者で検索..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  filterStatus === s
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {s === "all" ? "すべて" : statusConfig[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* イベント別フィルター */}
        {seminarOptions.length > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              value={seminarFilter}
              onChange={(e) => setSeminarFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="all">すべての回</option>
              {seminarOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.date)}　{s.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ロード中表示 */}
        {loading && (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">読み込み中...</p>
          </div>
        )}

        {/* 申請リスト */}
        {!loading && (
          <div className="space-y-4">
            {filtered.map((r) => {
              const status = statusConfig[r.status];
              const StatusIcon = status.icon;
              const isExpanded = expandedId === r.id;
              const name = r.applicant?.name ?? "（名前なし）";
              const furigana = r.applicant?.name_furigana ?? "";
              const nickname = r.applicant?.nickname ?? "";
              const email = r.applicant?.email ?? "";
              const referrer = r.applicant?.referrer_name ?? "";
              const seminarTitle = r.seminar?.title ?? "—";
              const seminarDate = formatDate(r.seminar?.date ?? null);

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* メイン行 */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-base font-bold text-gray-900">
                          {name}
                        </span>
                        {furigana && (
                          <span className="text-xs text-gray-400">
                            （{furigana}）
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>
                          {seminarDate}　{seminarTitle}
                        </span>
                        {referrer && <span>紹介者: {referrer}</span>}
                        <span>申込: {formatDate(r.applied_at)}</span>
                      </div>
                    </div>
                  </button>

                  {/* 詳細展開 */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
                        {email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 break-all">
                              {email}
                            </span>
                          </div>
                        )}
                        {nickname && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">
                              呼び名: {nickname}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            {seminarDate} / {seminarTitle}
                          </span>
                        </div>
                        {r.seminar?.location && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">📍</span>
                            <span className="text-gray-600">
                              {r.seminar.location}
                            </span>
                          </div>
                        )}
                      </div>

                      {(r.notes || r.invite_code) && (
                        <div className="mb-4 space-y-1 text-xs text-gray-500">
                          {r.invite_code && (
                            <p>招待コード: {r.invite_code}</p>
                          )}
                          {r.notes && <p>メモ: {r.notes}</p>}
                        </div>
                      )}

                      {r.status === "pending" && (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {busyId === r.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                            承認する
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            disabled={busyId === r.id}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <UserX className="w-4 h-4" />
                            却下する
                          </button>
                        </div>
                      )}

                      {r.status === "approved" && r.approved_at && (
                        <p className="text-sm text-green-600">
                          ✓ {formatDate(r.approved_at)} に承認済み
                        </p>
                      )}
                      {r.status === "rejected" && r.rejected_at && (
                        <p className="text-sm text-red-600">
                          ✗ {formatDate(r.rejected_at)} に却下
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && !loadError && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <UserCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  該当する申請はありません
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
