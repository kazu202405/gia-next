// 本人専用：自分の applicants プロフィールを保存する。
//
// 動作:
//   1. 認証（auth.getUser）必須。未ログインは 401。
//   2. body から PROFILE_WRITABLE_FIELDS のホワイトリストだけ取り出して UPDATE。
//      tier / id / referrer_id 等の権限境界を跨ぐカラムは弾く。
//   3. UPDATE 後の行で完成度を判定。100% かつ tier='tentative' の場合に限り
//      tier='registered' に上書き UPDATE + activity_log INSERT (action='tier_auto_promote')。
//      既に 'registered' / 'paid' のユーザーは触らない（降格防止）。
//
// レスポンス:
//   { ok: true, promoted: boolean, completeness: number }
//
// 失敗時の方針:
//   - 本体の UPDATE 失敗 → 500。
//   - 自動昇格処理（tier 更新 / activity_log INSERT）失敗 → 保存自体は成功扱いで
//     console.warn のみ。promoted=false で返す。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROFILE_REQUIRED_FIELDS,
  computeProfileCompleteness,
} from "@/lib/profile-completeness";

// クライアントから書き込みを許可するカラム（mypage/edit の入力UI 20項目）。
// PROFILE_REQUIRED_FIELDS と同一だが、将来 required から外す任意項目が出ても
// 書き込みは許容したいケースがあるため、別リストとして定義する。
const PROFILE_WRITABLE_FIELDS = [
  "name",
  "name_furigana",
  "nickname",
  "status_message",
  "role_title",
  "job_title",
  "headline",
  "services_summary",
  "story_origin",
  "story_turning_point",
  "story_now",
  "story_future",
  "want_to_connect_with",
  "favorites",
  "current_hobby",
  "school_days_self",
  "personal_values",
  "contact_line",
  "contact_instagram",
  "contact_website",
] as const;

type WritableField = (typeof PROFILE_WRITABLE_FIELDS)[number];

// 空文字 → null 正規化。trim も同時に行う。
function normalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "ログインが必要です" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "リクエストボディが不正です" },
      { status: 400 },
    );
  }

  // ホワイトリストで payload を構築（未知のキーは無視 = tier 等を弾く）
  const payload: Partial<Record<WritableField, string | null>> = {};
  for (const field of PROFILE_WRITABLE_FIELDS) {
    if (field in body) {
      payload[field] = normalize(body[field]);
    }
  }

  // name は NOT NULL。空にしようとした場合は弾く。
  if ("name" in payload && payload.name === null) {
    return NextResponse.json(
      { error: "お名前は必須です" },
      { status: 400 },
    );
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { error: "更新対象のフィールドがありません" },
      { status: 400 },
    );
  }

  // 1) 本体 UPDATE + 完成度判定用に必要カラムを再取得
  const selectCols = [
    "tier",
    ...PROFILE_REQUIRED_FIELDS,
  ].join(", ");

  const { data: updated, error: uErr } = await supabase
    .from("applicants")
    .update(payload)
    .eq("id", user.id)
    .select(selectCols)
    .single();

  if (uErr || !updated) {
    return NextResponse.json(
      { error: `保存に失敗しました：${uErr?.message ?? "unknown error"}` },
      { status: 500 },
    );
  }

  // 2) 完成度算出
  const updatedRow = updated as unknown as Record<string, unknown> & {
    tier?: string | null;
  };
  const completeness = computeProfileCompleteness(
    updatedRow as Partial<
      Record<(typeof PROFILE_REQUIRED_FIELDS)[number], string | null | undefined>
    >,
  );

  // 3) 自動昇格判定（100% & tentative のみ）
  let promoted = false;
  if (completeness === 100 && updatedRow.tier === "tentative") {
    const { error: tierErr } = await supabase
      .from("applicants")
      .update({ tier: "registered" })
      .eq("id", user.id)
      .eq("tier", "tentative"); // 競合防止：他経路で tier が変わっていたら何もしない

    if (tierErr) {
      console.warn(
        "[profile/save] tier 自動昇格に失敗:",
        tierErr.message,
        { userId: user.id },
      );
    } else {
      promoted = true;

      // activity_log に記録（失敗しても昇格は維持）
      const { error: logErr } = await supabase.from("activity_log").insert({
        actor_id: user.id,
        subject_type: "applicant",
        subject_id: user.id,
        action: "tier_auto_promote",
        details: {
          old_tier: "tentative",
          new_tier: "registered",
          completeness,
          trigger: "profile_save",
        },
      });

      if (logErr) {
        console.warn(
          "[profile/save] activity_log 書き込み失敗:",
          logErr.message,
          { userId: user.id },
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    promoted,
    completeness,
  });
}
