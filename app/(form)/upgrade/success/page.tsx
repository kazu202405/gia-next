// Stripe Checkout 成功後の戻り先（Server Component）。
//
// セッション検証:
//   1. 認証必須
//   2. session_id を query から取り、Stripe API で retrieve
//   3. session.payment_status === 'paid' かつ session.customer の所有者が自分か確認
//   4. 検証失敗時は /upgrade に戻す（不正アクセス防止）
//
// 注意:
//   tier='paid' への反映は webhook が正本。
//   webhook が遅れて届いていない場合があるので、その旨を案内する。

import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";

export const metadata = {
  title: "ご入会ありがとうございます | GIA",
};

interface PageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function UpgradeSuccessPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const sp = await searchParams;
  const sessionId = sp.session_id;

  // session_id 無しでアクセスされたら /upgrade に戻す
  if (!sessionId || !sessionId.startsWith("cs_")) {
    redirect("/upgrade");
  }

  // Stripe API で session を verify
  const stripe = getStripeClient();
  let verified = false;
  let verifyError: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // metadata.applicant_id が自分の id と一致するか
    const ownerOk = session.metadata?.applicant_id === user.id;
    // payment_status: 'paid' / 'unpaid' / 'no_payment_required'
    const paid =
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required";
    if (ownerOk && paid) {
      verified = true;
    } else {
      verifyError = `verification failed (owner=${ownerOk}, paid=${paid})`;
    }
  } catch (e) {
    verifyError = e instanceof Error ? e.message : "unknown";
  }

  if (!verified) {
    // 不正な session_id や他人のもの → /upgrade に戻す
    return (
      <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
        <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 border border-rose-200 mb-6">
            <AlertCircle className="w-8 h-8 text-rose-600" aria-hidden />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[var(--gia-deck-navy)] tracking-[0.04em]">
            セッション確認に失敗しました
          </h1>
          <p className="mt-4 text-sm text-[var(--gia-deck-sub)] leading-[1.9]">
            URL が正しくない、もしくは決済が完了していない可能性があります。
            <br />
            お手数ですが、もう一度お試しください。
          </p>
          {verifyError && (
            <p className="mt-3 text-[10px] text-rose-500 font-mono opacity-60">
              {verifyError}
            </p>
          )}
          <div className="mt-8">
            <Link
              href="/upgrade"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-3.5 px-6 hover:bg-[var(--gia-deck-navy-deep)]"
            >
              アップグレードに戻る
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--gia-deck-gold)]/10 border border-[var(--gia-deck-gold)]/30 mb-6">
          <CheckCircle2 className="w-8 h-8 text-[var(--gia-deck-gold)]" aria-hidden />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[var(--gia-deck-navy)] tracking-[0.04em] leading-snug">
          ご入会ありがとうございます
        </h1>
        <p className="mt-4 text-sm text-[var(--gia-deck-sub)] leading-[1.9]">
          『GIAの酒場』へようこそ。
          <br />
          数十秒以内に本会員ステータスへ反映されます。
        </p>

        <div className="mt-10 space-y-3">
          <Link
            href="/members/app/mypage"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-3.5 px-6 hover:bg-[var(--gia-deck-navy-deep)] transition-colors"
          >
            マイページへ
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/members/app/coach"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-[var(--gia-deck-line)] text-[var(--gia-deck-navy)] text-sm font-semibold tracking-[0.08em] py-3.5 px-6 hover:bg-[var(--gia-deck-paper)] transition-colors"
          >
            紹介コーチを開く
          </Link>
        </div>

        <p className="mt-8 text-[11px] text-[var(--gia-deck-sub)] leading-relaxed">
          ※ 反映が遅れる場合は数分後にマイページを再読み込みしてください。<br />
          領収書は Stripe からメールで自動送付されます。
        </p>
      </div>
    </div>
  );
}
