// マイページ（Phase 1：実DB化）。
// 仮登録（Tier 1）ユーザーが「自分の申込状況」と「同イベント参加者」を確認できる画面。
//
// データソース:
//   - applicants（自分の名前 / nickname / email）
//   - event_attendees ← seminars join（自分の申込済みイベント）
//   - event_peers view（同 seminar_id の他参加者の限定情報）
//
// 認証:
//   middleware の認証ガードは現状 /admin 配下のみ。
//   ここでは念のため getUser() が null なら /login にリダイレクトする。
//
// レンダリング戦略:
//   Server Component。初回 fetch のみで完結し、ローディング状態を持たない。
//   エラー時は専用バナー JSX を return。
//
// 本登録UI（profile-sheet.bak）と全メンバー一覧は Phase 2（5/26 後）の対象外。

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Clock,
  Inbox,
  MapPin,
  MessageCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/auth/LogoutButton";

// ─── 型 ────────────────────────────────────────────────────────────

type AttendanceStatus = "pending" | "approved" | "rejected" | "cancelled";

interface MyApplicant {
  id: string;
  name: string;
  name_furigana: string | null;
  nickname: string | null;
  email: string | null;
}

interface MyAttendance {
  id: string;
  status: AttendanceStatus;
  applied_at: string;
  invite_code: string | null;
  seminar: {
    id: string;
    slug: string;
    title: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    line_group_url: string | null;
  } | null;
}

interface EventPeer {
  id: string;
  name: string;
  name_furigana: string | null;
  nickname: string | null;
  role_title: string | null;
  job_title: string | null;
  headline: string | null;
  seminar_id: string;
  attendance_status: AttendanceStatus;
  applied_at: string;
}

// ─── ステータス表示設定 ─────────────────────────────────────────────

const statusBadge: Record<
  AttendanceStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "主催者からの承認待ち",
    className:
      "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "参加確定",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  rejected: {
    label: "却下されました",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
  cancelled: {
    label: "キャンセル",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

// ─── ユーティリティ：日付・時刻フォーマット ─────────────────────────

function formatSeminarDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${weekdays[d.getDay()]})`;
}

/** "HH:MM:SS" → "HH:MM" */
function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

/** "20:00" + "21:30" → "20:00 - 21:30" / 開始のみ "20:00" */
function formatTimeRange(start: string | null, end: string | null): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (s && e) return `${s} - ${e}`;
  return s;
}

// ─── ページ本体 ────────────────────────────────────────────────────

export default async function MyPage() {
  const supabase = await createClient();

  // 1. 自分の auth user を取得（未ログインなら /login へ）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. データ取得を並列実行
  //    applicants / event_attendees / event_peers を同時に投げる
  const [applicantRes, attendancesRes, peersRes] = await Promise.all([
    supabase
      .from("applicants")
      .select("id, name, name_furigana, nickname")
      .eq("id", user.id)
      .single(),
    supabase
      .from("event_attendees")
      .select(
        `
        id, status, applied_at, invite_code,
        seminar:seminars(
          id, slug, title, date, start_time, end_time,
          location, line_group_url
        )
        `
      )
      .eq("user_id", user.id)
      .order("applied_at", { ascending: false }),
    supabase
      .from("event_peers")
      .select(
        "id, name, name_furigana, nickname, role_title, job_title, headline, seminar_id, attendance_status, applied_at"
      )
      .neq("id", user.id),
  ]);

  // 3. fatal なエラー（applicants と attendances の両方失敗）はエラー画面
  //    片方だけ取れていれば表示はする（peers は無くても表示可能）
  const fatalError =
    applicantRes.error && attendancesRes.error
      ? `${applicantRes.error.message} / ${attendancesRes.error.message}`
      : null;

  if (fatalError) {
    return <ErrorState message={fatalError} />;
  }

  // applicants の email は applicants テーブルに無い場合があるため auth user から
  const me: MyApplicant = applicantRes.data
    ? {
        id: applicantRes.data.id as string,
        name: (applicantRes.data.name as string) ?? "",
        name_furigana:
          (applicantRes.data.name_furigana as string | null) ?? null,
        nickname: (applicantRes.data.nickname as string | null) ?? null,
        email: user.email ?? null,
      }
    : {
        id: user.id,
        name: "",
        name_furigana: null,
        nickname: null,
        email: user.email ?? null,
      };

  // event_attendees の seminar は配列で返ってくるケースに備えて正規化
  const attendances: MyAttendance[] = (attendancesRes.data ?? []).map(
    (r: unknown) => {
      const row = r as Record<string, unknown>;
      const seminar = Array.isArray(row.seminar)
        ? (row.seminar[0] ?? null)
        : (row.seminar ?? null);
      return {
        id: row.id as string,
        status: row.status as AttendanceStatus,
        applied_at: row.applied_at as string,
        invite_code: (row.invite_code as string | null) ?? null,
        seminar: seminar as MyAttendance["seminar"],
      };
    }
  );

  const peers: EventPeer[] = (peersRes.data ?? []) as EventPeer[];

  // 表示用：見出しの呼び名（nickname > name の順）
  const displayName = me.nickname?.trim() || me.name?.trim() || "ゲスト";

  // ─── レンダリング ──────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      {/* スティッキーヘッダー */}
      <div className="sticky top-14 lg:top-0 z-20 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900">マイページ</h1>
          <LogoutButton redirectTo="/login" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 部分エラー（peers だけ取れなかった場合などの軽量警告） */}
        {peersRes.error && (
          <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              他の参加者情報の取得に失敗しました：{peersRes.error.message}
            </span>
          </div>
        )}

        {/* ようこそカード */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-2">
                Welcome
              </p>
              <h2
                className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight"
                style={{ fontFamily: "'Noto Serif JP', serif" }}
              >
                ようこそ、{displayName}さん
              </h2>
              {me.email && (
                <p className="text-sm text-gray-500 break-all">{me.email}</p>
              )}
            </div>
            <Link
              href="/members/app/mypage/edit"
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              プロフィールを編集
            </Link>
          </div>
        </section>

        {/* お申込済みのイベント */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">
              お申込済みのイベント
            </h3>
            {attendances.length > 0 && (
              <span className="text-xs text-gray-400">
                {attendances.length}件
              </span>
            )}
          </div>

          {attendances.length === 0 ? (
            <EmptyAttendances />
          ) : (
            <div className="space-y-5">
              {attendances.map((att) => {
                if (!att.seminar) return null; // 念のため
                // この attendance に紐づく peers（自分以外・同 seminar・有効 status）
                // rejected / cancelled は「他のお申込者」として表示するのは違和感があるため除外
                const peersOfThis = peers.filter(
                  (p) =>
                    p.seminar_id === att.seminar!.id &&
                    (p.attendance_status === "pending" ||
                      p.attendance_status === "approved")
                );
                return (
                  <AttendanceCard
                    key={att.id}
                    attendance={att}
                    peers={peersOfThis}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Phase 2 予告 */}
        <section className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400 leading-relaxed text-center">
            本登録UI（プロフィール詳細入力）と全メンバー一覧は、
            <br className="sm:hidden" />
            5/26 セミナー後に順次追加予定です。
          </p>
        </section>
      </div>
    </div>
  );
}

// ─── サブコンポーネント：申込カード ─────────────────────────────────

function AttendanceCard({
  attendance,
  peers,
}: {
  attendance: MyAttendance;
  peers: EventPeer[];
}) {
  const seminar = attendance.seminar!;
  const badge = statusBadge[attendance.status];
  const showLineButton =
    attendance.status === "approved" &&
    !!seminar.line_group_url &&
    seminar.line_group_url.trim().length > 0;

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 上部：セミナー情報 */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4
            className="text-lg font-bold text-gray-900 leading-snug"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            {seminar.title}
          </h4>
          <span
            className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="space-y-1.5 text-sm text-gray-600 mb-1">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{formatSeminarDate(seminar.date)}</span>
          </div>
          {(seminar.start_time || seminar.end_time) && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>
                {formatTimeRange(seminar.start_time, seminar.end_time)}
              </span>
            </div>
          )}
          {seminar.location && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>{seminar.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* 下部：他のお申込者 */}
      <div className="px-5 sm:px-6 py-5 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-xs font-bold text-gray-600 tracking-wide">
            他のお申込者
            {peers.length > 0 && (
              <span className="ml-1.5 text-gray-400 font-medium">
                ({peers.length}名)
              </span>
            )}
          </p>
        </div>

        {peers.length === 0 ? (
          <p className="text-xs text-gray-400 leading-relaxed pl-5">
            他のお申込者はまだいません。
          </p>
        ) : (
          <ul className="space-y-2">
            {peers.map((p) => (
              <PeerRow key={p.id} peer={p} />
            ))}
          </ul>
        )}
      </div>

      {/* LINE グループボタン（approved + URL 有り の時のみ） */}
      {showLineButton && (
        <div className="px-5 sm:px-6 py-4 border-t border-gray-100">
          <a
            href={seminar.line_group_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold py-3 px-5 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            LINEグループに参加
          </a>
        </div>
      )}
    </article>
  );
}

// ─── サブコンポーネント：参加者1行 ─────────────────────────────────

function PeerRow({ peer }: { peer: EventPeer }) {
  // 表示する補助情報の優先順位：role_title > job_title > headline
  const subInfo =
    peer.role_title?.trim() ||
    peer.job_title?.trim() ||
    peer.headline?.trim() ||
    null;

  // ニックネームが name と違うときだけ括弧付きで添える
  const showNickname =
    peer.nickname &&
    peer.nickname.trim().length > 0 &&
    peer.nickname.trim() !== peer.name?.trim();

  return (
    <li className="flex items-baseline gap-2 text-sm">
      <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0 translate-y-[-3px]" />
      <span className="font-medium text-gray-800">
        {peer.name || "(名前未登録)"}
      </span>
      {showNickname && (
        <span className="text-xs text-gray-400">（{peer.nickname}）</span>
      )}
      {subInfo && (
        <span className="text-xs text-gray-500 truncate">／{subInfo}</span>
      )}
    </li>
  );
}

// ─── サブコンポーネント：空状態 ─────────────────────────────────────

function EmptyAttendances() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 px-6 text-center">
      <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
      <p className="text-sm text-gray-500 mb-5">
        現在申込済みのイベントはありません。
      </p>
      <Link
        href="/join"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors"
      >
        セミナーに申込む
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ─── サブコンポーネント：エラー画面 ─────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen">
      <div className="sticky top-14 lg:top-0 z-20 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-gray-900">マイページ</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            データ取得に失敗しました
          </h2>
          <p className="text-sm text-gray-600 mb-2 break-all">{message}</p>
          <p className="text-xs text-gray-400 mb-6">
            時間をおいて再度お試しください。
          </p>
          {/* Server Component なのでフルリロードによる再 fetch を意図的に使う。
              <Link> だと client side navigation になりデータが再取得されないため <a> を採用。 */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/members/app/mypage"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            再読み込み
          </a>
        </div>
      </div>
    </div>
  );
}
