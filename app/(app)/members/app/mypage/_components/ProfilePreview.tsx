"use client";

// プロフィールプレビュー（共通カード）
//
// 使い場所：
//   - /members/app/mypage         自分のプロフィール表示（Server Component から呼び出し）
//   - /members/app/mypage/edit    編集中のリアルタイムプレビュー（Client Component から呼び出し）
//
// 表示方針：
//   - 空項目は描画しない（埋めるほどカードが充実していく）
//   - 全項目が空のときは emptyHint を中央に表示
//
// 型と整形関数は "use client" を付けない別ファイル ./profileData に分離してある
// （Server Component から関数として呼べるようにするため）。

import React from "react";
import { PROFILE_PREVIEW_KEYS, type ProfilePreviewData } from "./profileData";

// ─── コンポーネント本体 ──────────────────────────────────────────

interface ProfilePreviewProps {
  data: ProfilePreviewData;
  /** 全項目が空のときに表示する文言（改行は \n で） */
  emptyHint?: string;
}

export function ProfilePreview({ data, emptyHint }: ProfilePreviewProps) {
  const has = (...keys: (keyof ProfilePreviewData)[]) =>
    keys.some((k) => data[k].trim().length > 0);

  const anyFilled = PROFILE_PREVIEW_KEYS.some(
    (k) => data[k].trim().length > 0,
  );

  const initial = (data.name.trim() || data.nickname.trim() || "?").charAt(0);

  return (
    <article
      aria-label="プロフィールプレビュー"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      {!anyFilled ? (
        <div className="px-6 py-16 text-center">
          <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">
            {emptyHint ?? "まだ何も入力されていません。"}
          </p>
        </div>
      ) : (
        <>
          {/* 上部: アバター + 名前 + ステータス */}
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl font-semibold text-gray-500 flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base font-bold text-gray-900 truncate">
                  {data.name.trim() || (
                    <span className="text-gray-300">名前未入力</span>
                  )}
                </div>
                {data.name_furigana.trim() && (
                  <div className="text-[11px] text-gray-400 truncate">
                    {data.name_furigana}
                  </div>
                )}
                {data.nickname.trim() && (
                  <div className="text-xs text-gray-500 truncate mt-0.5">
                    “{data.nickname}”
                  </div>
                )}
              </div>
            </div>
            {data.status_message.trim() && (
              <div className="text-xs text-gray-600 italic leading-relaxed border-l-2 border-teal-200 pl-2.5">
                {data.status_message}
              </div>
            )}
          </div>

          {/* 仕事 */}
          {has("role_title", "job_title", "headline", "services_summary") && (
            <PreviewSection label="仕事">
              {has("role_title", "job_title") && (
                <div className="text-sm text-gray-900 font-medium">
                  {[data.role_title, data.job_title]
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .join(" / ")}
                </div>
              )}
              {data.headline.trim() && (
                <div className="text-xs text-gray-700 leading-relaxed mt-1.5">
                  {data.headline}
                </div>
              )}
              {data.services_summary.trim() && (
                <div className="text-xs text-gray-500 leading-relaxed mt-2 whitespace-pre-wrap">
                  {data.services_summary}
                </div>
              )}
            </PreviewSection>
          )}

          {/* ストーリー */}
          {has(
            "story_origin",
            "story_turning_point",
            "story_now",
            "story_future",
          ) && (
            <PreviewSection label="ストーリー">
              {data.story_origin.trim() && (
                <PreviewQA q="始めたきっかけ" a={data.story_origin} />
              )}
              {data.story_turning_point.trim() && (
                <PreviewQA q="転機" a={data.story_turning_point} />
              )}
              {data.story_now.trim() && (
                <PreviewQA q="いまの想い" a={data.story_now} />
              )}
              {data.story_future.trim() && (
                <PreviewQA q="これから" a={data.story_future} />
              )}
            </PreviewSection>
          )}

          {/* つながり */}
          {data.want_to_connect_with.trim() && (
            <PreviewSection label="どんな人と繋がりたいか">
              <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                {data.want_to_connect_with}
              </div>
            </PreviewSection>
          )}

          {/* 人柄 */}
          {has(
            "favorites",
            "current_hobby",
            "school_days_self",
            "personal_values",
          ) && (
            <PreviewSection label="人柄">
              {data.favorites.trim() && (
                <PreviewKV k="好きなもの" v={data.favorites} />
              )}
              {data.current_hobby.trim() && (
                <PreviewKV k="最近ハマってる" v={data.current_hobby} />
              )}
              {data.school_days_self.trim() && (
                <PreviewKV k="学生時代" v={data.school_days_self} />
              )}
              {data.personal_values.trim() && (
                <PreviewKV k="大切にしてる" v={data.personal_values} />
              )}
            </PreviewSection>
          )}

          {/* 連絡先 */}
          {has("contact_line", "contact_instagram", "contact_website") && (
            <PreviewSection label="連絡先">
              {data.contact_line.trim() && (
                <PreviewKV k="LINE" v={data.contact_line} />
              )}
              {data.contact_instagram.trim() && (
                <PreviewKV k="Instagram" v={data.contact_instagram} />
              )}
              {data.contact_website.trim() && (
                <PreviewKV k="Web" v={data.contact_website} />
              )}
            </PreviewSection>
          )}
        </>
      )}
    </article>
  );
}

// ─── 内部コンポーネント ────────────────────────────────────────

function PreviewSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  // 区切り線は左右に余白を残した擬似要素で描く（端まで届かないので圧迫感が出ない）
  return (
    <section className="px-6 py-4 relative before:absolute before:inset-x-6 before:top-0 before:border-t before:border-gray-100">
      <h3 className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase mb-2">
        {label}
      </h3>
      <div>{children}</div>
    </section>
  );
}

function PreviewQA({ q, a }: { q: string; a: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-[11px] font-semibold text-gray-500 mb-1">{q}</div>
      <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
        {a}
      </div>
    </div>
  );
}

function PreviewKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-3 mb-1.5 last:mb-0 text-xs">
      <span className="text-gray-400 flex-shrink-0 w-20">{k}</span>
      <span className="text-gray-700 leading-relaxed break-words min-w-0">
        {v}
      </span>
    </div>
  );
}
