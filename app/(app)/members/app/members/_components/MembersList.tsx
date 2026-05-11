"use client";

// メンバー一覧の検索/絞り込み UI（Client Component）。
// 表示データそのものは Server Component で applicants から取得済みで、
// ここではクライアント側フィルタのみ行う。
//
// 設計判断:
//   - 法人/個人・ジャンル絞り込みは applicants に該当列が無いため一旦撤去
//     （Phase 2 で genre 列を追加してから復活させる）
//   - 検索は name / nickname / role_title / job_title / headline / services_summary の部分一致

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

export interface MemberItem {
  id: string;
  name: string;
  nickname: string | null;
  role_title: string | null;
  job_title: string | null;
  headline: string | null;
  services_summary: string | null;
  tier: string;
}

interface MembersListProps {
  members: MemberItem[];
  errorMessage: string | null;
}

export function MembersList({ members, errorMessage }: MembersListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const haystack = [
        m.name,
        m.nickname,
        m.role_title,
        m.job_title,
        m.headline,
        m.services_summary,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, query]);

  return (
    <>
      {/* 検索バー */}
      <div className="sticky top-0 z-10 bg-[var(--gia-warm-gray)]/85 backdrop-blur-sm border-b border-[var(--gia-navy)]/8">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 py-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="名前・肩書き・サービスで検索"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-[var(--gia-navy)]/15 bg-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--gia-navy)]/30 focus:border-transparent"
            />
          </div>
          <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.28em] text-gray-500 uppercase mt-3">
            {String(filtered.length).padStart(2, "0")}{" "}
            {filtered.length === 1 ? "Member" : "Members"}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 lg:px-10 py-8">
        {errorMessage && (
          <div className="mb-6 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            メンバー情報の取得に失敗しました：{errorMessage}
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState hasQuery={query.trim().length > 0} />
        ) : (
          <ul className="space-y-3">
            {filtered.map((member) => (
              <li key={member.id}>
                <MemberCard member={member} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function MemberCard({ member }: { member: MemberItem }) {
  const displayName = member.nickname?.trim() || member.name || "—";
  const subInfo =
    member.role_title?.trim() ||
    member.job_title?.trim() ||
    member.headline?.trim() ||
    "";
  const isPaid = member.tier === "paid";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <Link
      href={`/members/app/profile/${member.id}`}
      className="group flex items-start gap-4 bg-white rounded-2xl border border-[var(--gia-navy)]/8 shadow-[0_1px_2px_rgba(15,31,51,0.04)] hover:shadow-[0_8px_24px_-12px_rgba(15,31,51,0.12)] hover:border-[var(--gia-navy)]/15 transition-all p-5"
    >
      {/* イニシャル円（写真機能は migration 後に実装） */}
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] font-bold text-base border border-[var(--gia-teal)]/15 flex-shrink-0">
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3
            className="text-[15px] font-medium text-[var(--gia-navy)] truncate group-hover:text-[var(--gia-teal)] transition-colors"
            style={{ fontFamily: "'Noto Serif JP', serif" }}
          >
            {displayName}
          </h3>
          {isPaid && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gia-teal)]/[0.08] text-[var(--gia-teal)] border border-[var(--gia-teal)]/30 tracking-[0.03em]">
              本会員
            </span>
          )}
        </div>
        {subInfo && (
          <p className="text-xs text-gray-500 leading-[1.85] truncate">
            {subInfo}
          </p>
        )}
        {member.headline && member.headline.trim() !== subInfo && (
          <p className="text-xs text-gray-400 leading-[1.85] mt-1 truncate">
            {member.headline}
          </p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[var(--gia-teal)] transition-colors flex-shrink-0 mt-1" />
    </Link>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="text-center py-16">
      <p className="text-sm text-gray-500 leading-[1.95] font-[family-name:var(--font-mincho)]">
        {hasQuery
          ? "該当するメンバーが見つかりません。検索条件を変えてお試しください。"
          : "メンバーがまだ登録されていません。"}
      </p>
    </div>
  );
}
