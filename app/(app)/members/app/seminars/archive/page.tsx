// セミナー アーカイブ（会員向け）。
// 過去回（date<今日）のうち recording_url（YouTube）が設定されたものを、
// 埋め込みプレイヤーで一覧表示する。参加できなかった会員向けの録画視聴ページ。
//
// データソース: seminars（date<今日, recording_url IS NOT NULL）
// 動画は YouTube 任せ（自前保存しない）＝最軽量。
// 認証: 未ログインは /login へ。

import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Inbox, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventType = "seminar" | "social" | "workshop" | "other";

interface ArchiveRow {
  id: string;
  title: string;
  date: string;
  description: string | null;
  recording_url: string | null;
  event_type: EventType;
}

const eventTypeLabel: Record<EventType, string> = {
  seminar: "セミナー",
  social: "懇親会",
  workshop: "ワークショップ",
  other: "イベント",
};

function formatSeminarDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${weekdays[d.getDay()]})`;
}

/** YouTube の watch?v= / youtu.be / shorts URL から埋め込み用 URL を作る。失敗時は null。 */
function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.slice(1);
    } else if (u.pathname.startsWith("/embed/")) {
      id = u.pathname.split("/embed/")[1] ?? "";
    } else if (u.pathname.startsWith("/shorts/")) {
      id = u.pathname.split("/shorts/")[1] ?? "";
    } else {
      id = u.searchParams.get("v") ?? "";
    }
    id = id.split("/")[0].split("?")[0];
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

export default async function SeminarArchivePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("seminars")
    .select("id, title, date, description, recording_url, event_type")
    .lt("date", todayStr)
    .not("recording_url", "is", null)
    .order("date", { ascending: false });

  const rows = (data ?? []) as ArchiveRow[];

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Library
        </p>
        <h1
          className="text-[var(--gia-navy)] tracking-[0.04em] mb-2"
          style={{
            fontFamily: "'Noto Serif JP', serif",
            fontSize: "clamp(20px, 2.6vw, 26px)",
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          過去の勉強会
        </h1>
        <p className="text-[13px] text-gray-500 leading-[1.95]">
          参加できなかった回も、ここから録画で学べます。
        </p>

        {/* 開催予定への導線 */}
        <Link
          href="/members/app/seminars"
          className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-medium text-[var(--gia-teal)] hover:underline"
        >
          <CalendarClock className="w-4 h-4" />
          開催予定のセミナーを見る
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 pb-16">
        {error ? (
          <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            アーカイブの取得に失敗しました：{error.message}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {rows.map((s) => {
              const embed = s.recording_url
                ? toYouTubeEmbed(s.recording_url)
                : null;
              return (
                <article
                  key={s.id}
                  className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04),0_8px_24px_-12px_rgba(15,31,51,0.06)] overflow-hidden"
                >
                  {/* プレイヤー */}
                  {embed ? (
                    <div className="relative w-full aspect-video bg-black">
                      <iframe
                        src={embed}
                        title={s.title}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    s.recording_url && (
                      <a
                        href={s.recording_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-6 py-4 bg-[var(--gia-navy)] text-white text-sm font-medium text-center hover:bg-[var(--gia-navy)]/90 transition-colors"
                      >
                        録画を見る（外部リンク）
                      </a>
                    )
                  )}

                  <div className="p-6 sm:p-7">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] text-[10.5px] font-bold mb-2 tracking-[0.04em]">
                      {eventTypeLabel[s.event_type] ?? "イベント"}
                    </span>
                    <h2
                      className="text-[var(--gia-navy)] leading-snug tracking-[0.02em] mb-3"
                      style={{
                        fontFamily: "'Noto Serif JP', serif",
                        fontSize: "clamp(17px, 2.2vw, 20px)",
                        fontWeight: 500,
                      }}
                    >
                      {s.title}
                    </h2>
                    <div className="flex items-center gap-2.5 text-[13px] text-gray-500 mb-3">
                      <CalendarDays className="w-4 h-4 text-[var(--gia-teal)] flex-shrink-0" />
                      <span>{formatSeminarDate(s.date)}</span>
                    </div>
                    {s.description && (
                      <p className="text-[13px] text-gray-500 leading-[1.9] whitespace-pre-line">
                        {s.description}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] py-14 px-6 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--gia-teal)]/8 mb-5">
        <Inbox className="w-6 h-6 text-[var(--gia-teal)]" strokeWidth={1.5} />
      </div>
      <p
        className="text-[15px] text-[var(--gia-navy)] mb-2 tracking-[0.03em]"
        style={{ fontFamily: "'Noto Serif JP', serif" }}
      >
        まだ過去の勉強会の動画はありません
      </p>
      <p className="text-xs text-gray-500 leading-[1.9] font-[family-name:var(--font-mincho)]">
        開催した回の録画が、順次ここに追加されます。
      </p>
    </div>
  );
}
