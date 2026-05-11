// メンバー一覧（Phase 2：実DB化 + paid ガード）。
// applicants から自分以外の全メンバーを取得し、検索フィルタは Client Component に委譲する。
//
// 認証ガード:
//   requirePaid() で tier='paid' を要求。仮登録ユーザーは /upgrade に redirect。
//   サイドバー側でも paid 時しか表示されないが、URL 直叩き対策として多重防御する。
//
// 表示方針:
//   - tier='paid' が先頭、その後 updated_at desc
//   - 自分自身は除外（neq id）
//   - 法人/個人・ジャンル絞り込みは applicants の該当列が無いため一旦撤去
//
// 公開範囲の論点（network_app.md より）:
//   本来は「自分のイベントに参加した招待者のみ」が公開対象だが、
//   Phase 1 ではセミナー参加者同士の紹介を促す観点で applicants 全件を表示する。
//   将来的に event_attendees join で「自分の参加イベントに居た人だけ」に絞る可能性あり。

import { requirePaid } from "@/lib/guards/paid-guard";
import {
  MembersList,
  type MemberItem,
} from "./_components/MembersList";

export default async function MembersPage() {
  const { supabase, userId } = await requirePaid();

  const { data, error } = await supabase
    .from("applicants")
    .select(
      "id, name, nickname, tier, photo_url, role_title, job_title, headline, services_summary, genre, location, updated_at",
    )
    .neq("id", userId)
    .order("tier", { ascending: false })
    .order("updated_at", { ascending: false });

  const members: MemberItem[] = ((data ?? []) as unknown[]).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      name: (row.name as string) ?? "",
      nickname: (row.nickname as string | null) ?? null,
      photo_url: (row.photo_url as string | null) ?? null,
      role_title: (row.role_title as string | null) ?? null,
      job_title: (row.job_title as string | null) ?? null,
      headline: (row.headline as string | null) ?? null,
      services_summary: (row.services_summary as string | null) ?? null,
      genre: (row.genre as string | null) ?? null,
      location: (row.location as string | null) ?? null,
      tier: (row.tier as string) ?? "tentative",
    };
  });

  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      {/* ヘッダー（mypage と同じトーン） */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-10">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Members ─── Directory
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
          メンバー
        </h1>
        <p className="text-[13px] text-gray-500 leading-[1.95]">
          会員の方々のプロフィールから、紹介してほしい方を見つけられます。
        </p>
      </div>

      <MembersList members={members} errorMessage={error?.message ?? null} />
    </div>
  );
}
