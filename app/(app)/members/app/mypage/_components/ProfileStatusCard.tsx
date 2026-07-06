"use client";

// マイページ最上段の「ステータス + メンバー登録の動機作り」カード。
//
// plan / tier で表示を切替（plan='terakoya' を最優先）：
//   terakoya   : テラこや会員バッジ（課金済みなのでアップグレード訴求は出さない）
//   tentative  : 完成度プログレスバー + 残り項目数 + 編集 CTA（メンバー登録への動機）
//   registered : 「メンバー登録完了」+ テラこや¥11,000（/members）への誘い
//                + 初回到達時のお祝い演出（localStorage で一度きり）
//   paid       : 旧サロン/本会員バッジ（レガシー・プログレスは出さない）

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ChevronRight,
  Pencil,
  CheckCircle2,
  Crown,
  Users,
  MessageCircle,
  BookOpen,
  X,
} from "lucide-react";

type Tier = "tentative" | "registered" | "paid";

interface Props {
  userId: string;
  tier: Tier | string;
  plan?: string | null; // 'salon' | 'pro' | null（paid 時の値段帯）
  memberNo?: number | null; // 有料会員の通し番号（無料は null）
  completeness: number; // 0-100
  missingFieldLabels: string[]; // tentative 時の残り項目ラベル
}

export function ProfileStatusCard({
  userId,
  tier,
  plan,
  memberNo,
  completeness,
  missingFieldLabels,
}: Props) {
  // ── お祝い演出（registered 初回到達のみ）───────────────────────
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (tier !== "registered") return;
    if (typeof window === "undefined") return;
    const key = `gia-mypage-celebrated-registered:${userId}`;
    if (window.localStorage.getItem(key) === "1") return;
    // localStorage（外部 state）との同期で effect 内 setState は正当な用途。
    // hydration mismatch 回避のため初回 render では false のまま、effect で flip する。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowCelebration(true);
    window.localStorage.setItem(key, "1");
    // 8秒で自動 fade out（ユーザー操作で即閉じも可）
    const t = window.setTimeout(() => setShowCelebration(false), 8000);
    return () => window.clearTimeout(t);
  }, [tier, userId]);

  // ── テラこや会員（plan='terakoya'）: 会員バッジ。既に課金済みなので
  //    アップグレード訴求は一切出さない（tier に依らず plan を最優先で判定）。──
  if (plan === "terakoya") {
    return (
      <div className="rounded-2xl border border-[var(--gia-gold)]/30 bg-gradient-to-br from-[var(--gia-gold)]/[0.06] to-white px-5 sm:px-7 py-5 flex items-center gap-3">
        <Crown className="w-5 h-5 text-[var(--gia-gold)] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] tracking-[0.28em] text-[var(--gia-gold)] font-semibold uppercase">
            Member
          </p>
          <p className="font-[family-name:var(--font-mincho)] text-[15px] text-[var(--gia-navy)] mt-0.5">
            HIROGARUキャンパス会員
          </p>
          {memberNo != null && (
            <p className="text-[11px] text-gray-500 mt-0.5 tracking-[0.04em]">
              会員番号 No.{memberNo}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── paid: 会員バッジ（plan で 本会員/サロン会員 を出し分け） ──────────
  if (tier === "paid") {
    const isPro = plan === "pro";
    return (
      <div className="rounded-2xl border border-[var(--gia-gold)]/30 bg-gradient-to-br from-[var(--gia-gold)]/[0.06] to-white px-5 sm:px-7 py-5 flex items-center gap-3">
        <Crown className="w-5 h-5 text-[var(--gia-gold)] flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] tracking-[0.28em] text-[var(--gia-gold)] font-semibold uppercase">
            {isPro ? "Full Member" : "Member"}
          </p>
          <p className="font-[family-name:var(--font-mincho)] text-[15px] text-[var(--gia-navy)] mt-0.5">
            {isPro ? "本会員（右腕AI込み）" : "一般会員（有料）"}
          </p>
          {memberNo != null && (
            <p className="text-[11px] text-gray-500 mt-0.5 tracking-[0.04em]">
              会員番号 No.{memberNo}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── registered: メンバー登録完了 + テラこや入会への動機作り ──────────
  if (tier === "registered") {
    return (
      <>
        {showCelebration && (
          <CelebrationBanner onDismiss={() => setShowCelebration(false)} />
        )}
        <div className="rounded-2xl border border-[#c5d3c8] bg-gradient-to-br from-[#e9efe9] via-white to-white overflow-hidden">
          {/* ヘッダー */}
          <div className="px-5 sm:px-7 py-5 sm:py-6 flex items-start gap-3 border-b border-[#c5d3c8]/60">
            <CheckCircle2 className="w-5 h-5 text-[#3d6651] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] tracking-[0.28em] text-[#3d6651] font-semibold uppercase">
                Registered
              </p>
              <h3 className="font-[family-name:var(--font-mincho)] text-[17px] sm:text-[19px] text-[var(--gia-navy)] mt-1 tracking-[0.02em]">
                メンバー登録、完了しました
              </h3>
              <p className="text-[12.5px] text-gray-600 mt-1.5 leading-[1.85]">
                プロフィールが完成しています。
                <br className="sm:hidden" />
                学びと出会いを、次のステップへ。
              </p>
            </div>
          </div>

          {/* テラこや入会の誘い（月額¥11,000・税込） */}
          <div className="px-5 sm:px-7 py-5">
            <p className="text-[11px] tracking-[0.25em] text-[var(--gia-gold)] font-semibold uppercase mb-3">
              HIROGARUキャンパス — 月額11,000円（税込）
            </p>
            <ul className="space-y-2.5 mb-5">
              <UnlockRow
                Icon={BookOpen}
                title="月1回の勉強会・事例研究"
                desc="うまくいっている企業の中身を学ぶ"
              />
              <UnlockRow
                Icon={Users}
                title="参加者同士の交流・紹介・協業"
                desc="経営者・挑戦者とつながり、仕事を動かす"
              />
              <UnlockRow
                Icon={MessageCircle}
                title="壁打ち相談会・リアル懇親会"
                desc="事業の悩みを持ち寄って一緒に考える"
              />
            </ul>
            <Link
              href="/members"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-[var(--gia-navy)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              HIROGARUキャンパスに参加する
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ── tentative: プログレス + 残り項目 + 編集 CTA ──────────────
  //   数値（残り項目数・パーセント）はプレッシャーになるため出さない（バーは視覚のみ）。
  return (
    <div className="rounded-2xl border border-[#e6d3a3] bg-gradient-to-br from-[#fbf3e3]/60 via-white to-white px-5 sm:px-7 py-5 sm:py-6">
      <div className="flex items-start gap-3 mb-4">
        <Sparkles className="w-5 h-5 text-[var(--gia-gold)] flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] tracking-[0.28em] text-[var(--gia-gold)] font-semibold uppercase">
            Tentative
          </p>
          <h3 className="font-[family-name:var(--font-mincho)] text-[17px] sm:text-[19px] text-[var(--gia-navy)] mt-1 tracking-[0.02em]">
            {completeness < 100
              ? "あと少しで、メンバー登録が整います"
              : "メンバー登録の確認を待っています"}
          </h3>
          <p className="text-[12.5px] text-gray-600 mt-1.5 leading-[1.85]">
            プロフィールが揃うと、自動で
            <span className="font-semibold text-[var(--gia-navy)]">
              メンバー登録
            </span>
            が完了します。あなたのことが場に伝わり、他のメンバーとも出会いやすくなります。
          </p>
        </div>
      </div>

      {/* プログレスバー（数値は出さず、進み具合を視覚的にだけ示す） */}
      <div className="mb-4">
        <div className="h-2 rounded-full bg-[#fbf3e3] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--gia-gold)] to-[#d8a85a] transition-[width] duration-700 ease-out"
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      {/* 残り項目（最大6つまで表示） */}
      {missingFieldLabels.length > 0 && (
        <details className="mb-4 text-xs">
          <summary className="cursor-pointer text-gray-600 hover:text-[var(--gia-navy)] select-none">
            まだ書いていない項目を見る
          </summary>
          <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5 text-gray-700">
            {missingFieldLabels.map((label) => (
              <li key={label} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[var(--gia-gold)]" />
                {label}
              </li>
            ))}
          </ul>
        </details>
      )}

      <Link
        href="/members/app/mypage/edit"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-[var(--gia-navy)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <Pencil className="w-4 h-4" />
        プロフィールを編集する
      </Link>
    </div>
  );
}

// ─── サブ：解禁予告の1行 ──────────────────────────────────────
function UnlockRow({
  Icon,
  title,
  desc,
}: {
  Icon: typeof Users;
  title: string;
  desc: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-[var(--gia-gold)] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--gia-navy)] leading-tight">
          {title}
        </p>
        <p className="text-[11.5px] text-gray-500 mt-0.5 leading-snug">
          {desc}
        </p>
      </div>
    </li>
  );
}

// ─── サブ：お祝いバナー（registered 初回到達のみ）───────────────
function CelebrationBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-6 z-50 flex justify-center px-4 pointer-events-none animate-[gia-celebrate-in_500ms_ease-out]"
    >
      <div className="pointer-events-auto max-w-md w-full rounded-xl bg-white border border-[var(--gia-gold)]/40 shadow-2xl shadow-[var(--gia-gold)]/10 overflow-hidden">
        {/* 上部ゴールドバー */}
        <div className="h-1 bg-gradient-to-r from-[var(--gia-gold)] via-[#d8a85a] to-[var(--gia-gold)]" />
        <div className="px-5 py-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[var(--gia-gold)] flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] tracking-[0.3em] text-[var(--gia-gold)] font-semibold uppercase">
              Welcome
            </p>
            <p className="font-[family-name:var(--font-mincho)] text-[15px] text-[var(--gia-navy)] mt-1 leading-tight">
              メンバー登録が完了しました
            </p>
            <p className="text-[11.5px] text-gray-600 mt-1 leading-snug">
              GIA へようこそ。あなたのストーリーが届く準備が整いました。
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="閉じる"
            className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes gia-celebrate-in {
          0% {
            opacity: 0;
            transform: translateY(-12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
