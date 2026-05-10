// 紹介コーチ chat ページ（プラン0「紹介コーチ」のサロン内実装）。
//
// 役割:
//   サロン会員（applicants にレコードがあるユーザー）が、
//   GIA共通の紹介ナレッジに基づいてコーチ AI に相談できる場所。
//   プラン0として AI Clone の手前に位置し、サロン¥990 の特典として包含する。
//
// データソース（Phase 1）:
//   - applicants（呼びかけ用の name / nickname 取得のみ）
//
// データソース（Phase 2 で追加）:
//   - Notion 紹介ナレッジ DB（v4.1セミナー由来の 5条件 / 行動分解 / 判断パターン）
//   - Supabase 経由で pgvector RAG
//   - OpenAI streaming（`/api/coach/chat`）
//
// 認証:
//   getUser() が null なら /login にリダイレクト（mypage と同じ方針）。
//
// レンダリング戦略:
//   Server Component で auth + initial data 取得 → Client Component (CoachChat) に渡す。
//
// 履歴方針（Phase 1）:
//   同一セッション中のみ React state で保持。リロード / 遷移で消える。
//   後で localStorage → Supabase の段階で格上げ予定。

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CoachChat } from "./_components/CoachChat";

export const metadata = {
  title: "紹介コーチ | GIA Stories",
  description:
    "サロン会員向け、紹介の悩みに伴走するAIコーチ。紹介の5条件・行動分解・判断パターンに基づいて相談できます。",
};

export default async function CoachPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: applicant } = await supabase
    .from("applicants")
    .select("name, nickname")
    .eq("id", user.id)
    .single();

  // 呼びかけは nickname > name の優先度
  const callName = applicant?.nickname || applicant?.name || null;

  return <CoachChat initialName={callName} />;
}
