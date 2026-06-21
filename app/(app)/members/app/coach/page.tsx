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
import Link from "next/link";
import { Lock, Sparkles, Check, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveTenantForOwner } from "@/lib/ai-clone/supabase-db";
import { fetchCoachHistory } from "@/lib/coach/coach-history";
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
    .select("name, nickname, tier")
    .eq("id", user.id)
    .single();

  // tier ガード：非 paid は使わせないが、/upgrade へ即リダイレクトせず
  // 「アップグレードして使ってね」のティーザーを見せる（機能を可視化して訴求）。
  if (applicant?.tier !== "paid") {
    return <CoachUpsell />;
  }

  // 呼びかけは nickname > name の優先度
  const callName = applicant?.nickname || applicant?.name || null;

  // 右腕AI（22DB）連携：owner テナントを持つ会員だけトグルを出す。
  // 持っていなければ linkAvailable=false（990円素コーチ確定）。
  const tenant = await resolveTenantForOwner(user.id);

  // 履歴方針:
  //   4,980円（owner テナント有）= Supabase に1本で永続。初期ロードで復元して渡す。
  //   990円（テナント無）        = 端末ローカル保存。クライアント側で復元。
  const persistMode: "server" | "local" = tenant ? "server" : "local";
  const initialHistory =
    tenant ? await fetchCoachHistory(supabase, tenant.id) : [];

  return (
    <CoachChat
      initialName={callName}
      linkAvailable={!!tenant}
      linkEnabled={tenant?.coachLinkEnabled ?? false}
      persistMode={persistMode}
      initialHistory={initialHistory}
      storageKey={`gia-coach:${user.id}`}
    />
  );
}

// ─── 非会員向けティーザー（機能を見せてアップグレードへ誘導） ─────────
function CoachUpsell() {
  return (
    <div className="min-h-screen bg-[var(--gia-warm-gray)]">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 lg:px-10 pt-10 sm:pt-14 pb-16">
        <p className="font-[family-name:var(--font-en)] text-[10.5px] tracking-[0.34em] text-[var(--gia-teal)] uppercase mb-2.5">
          Referral Coach
        </p>
        <h1
          className="text-[var(--gia-navy)] tracking-[0.04em] mb-3"
          style={{
            fontFamily: "'Noto Serif JP', serif",
            fontSize: "clamp(22px, 3vw, 28px)",
            fontWeight: 500,
          }}
        >
          紹介コーチ
        </h1>
        <p className="text-sm text-gray-600 leading-[1.95] mb-8">
          紹介の悩みに、AIが伴走します。「誰に・どう頼むか」「この人にどう紹介を切り出すか」を、
          紹介の5条件・行動分解・判断パターンに沿って一緒に詰められます。
        </p>

        <div className="bg-white rounded-2xl border border-[var(--gia-gold)]/30 shadow-sm overflow-hidden">
          <div className="px-6 sm:px-8 py-6 border-b border-[var(--gia-gold)]/20 flex items-start gap-3">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-[var(--gia-gold)]/10 flex-shrink-0">
              <Lock className="w-5 h-5 text-[var(--gia-gold)]" />
            </div>
            <div>
              <p className="text-[11px] tracking-[0.25em] text-[var(--gia-gold)] font-semibold uppercase mb-1">
                Salon Member 〜
              </p>
              <h2 className="font-[family-name:var(--font-mincho)] text-[17px] text-[var(--gia-navy)]">
                サロン会員（¥990 / 月）から使えます
              </h2>
            </div>
          </div>
          <div className="px-6 sm:px-8 py-6">
            <ul className="space-y-2.5 text-sm text-gray-700 mb-6">
              <li className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[var(--gia-gold)] flex-shrink-0 mt-0.5" />
                <span>24時間いつでも、紹介の相談ができる</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[var(--gia-gold)] flex-shrink-0 mt-0.5" />
                <span>自分のストーリー・紹介文をAIと一緒に磨く</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[var(--gia-gold)] flex-shrink-0 mt-0.5" />
                <span>本会員（¥4,980）なら右腕AIと連携してさらに精度UP</span>
              </li>
            </ul>
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-md bg-[var(--gia-navy)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              プランを見る
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
