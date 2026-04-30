"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, Lock, Check } from "lucide-react";

// Tier 3（有料会員）チェックアウト画面。
// 以前は /join/checkout に置かれていたが、/join を仮登録に振り替えたためこのルートに退避した。
// Phase 2 で Stripe Checkout に差し替える想定。
//
// 2026-04-27 デザイン方針: GIA A系統（資料と同トーン）に統一。
// gray-50/gray-900 と indigo を全廃し、Navy + Warm Gold + ivory + Serif で構成。

const plans = [
  { id: "light", name: "ライトプラン", price: "1,980" },
  { id: "standard", name: "スタンダードプラン", price: "3,980", recommended: true },
  { id: "premium", name: "プレミアムプラン", price: "4,980" },
];

export default function UpgradeCheckoutPage() {
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [submitted, setSubmitted] = useState(false);

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--gia-deck-paper)] flex items-center justify-center pt-24 pb-16 px-4">
        <div className="max-w-md w-full text-center">
          <ChapterTag>THANK YOU</ChapterTag>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--gia-deck-gold)]/10 text-[var(--gia-deck-gold)] mt-6 mb-5 border border-[var(--gia-deck-gold)]/30">
            <Check className="w-7 h-7" strokeWidth={1.75} />
          </div>
          <h1 className="font-serif text-[26px] sm:text-[30px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mb-4">
            お申し込みありがとうございます
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] leading-[1.9] mb-9">
            現在、決済機能を準備中です。
            <br />
            サービス開始時にご登録のメールアドレスへご案内いたします。
            <br />
            もうしばらくお待ちください。
          </p>
          <Link
            href="/members/app/mypage"
            className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200"
          >
            マイページへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-2 text-sm text-[var(--gia-deck-sub)] hover:text-[var(--gia-deck-navy)] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          登録情報の入力に戻る
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Payment form */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-9">
                <div className="w-10 h-10 rounded-xl bg-[var(--gia-deck-navy)] flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <SectionLabel>PAYMENT</SectionLabel>
                  <h1 className="font-serif text-lg font-bold text-[var(--gia-deck-navy)] tracking-[0.03em] mt-1">
                    お支払い情報
                  </h1>
                  <p className="text-[12px] text-[var(--gia-deck-sub)] mt-0.5">
                    クレジットカード情報を入力してください
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Card number */}
                <div>
                  <label
                    htmlFor="card-number"
                    className="block text-sm font-medium text-[var(--gia-deck-ink)] mb-2"
                  >
                    カード番号
                  </label>
                  <input
                    type="text"
                    id="card-number"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className={inputClass}
                  />
                </div>

                {/* Expiry & CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="expiry"
                      className="block text-sm font-medium text-[var(--gia-deck-ink)] mb-2"
                    >
                      有効期限
                    </label>
                    <input
                      type="text"
                      id="expiry"
                      placeholder="MM / YY"
                      maxLength={7}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cvc"
                      className="block text-sm font-medium text-[var(--gia-deck-ink)] mb-2"
                    >
                      セキュリティコード
                    </label>
                    <input
                      type="text"
                      id="cvc"
                      placeholder="123"
                      maxLength={4}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Cardholder name */}
                <div>
                  <label
                    htmlFor="cardholder"
                    className="block text-sm font-medium text-[var(--gia-deck-ink)] mb-2"
                  >
                    カード名義人
                  </label>
                  <input
                    type="text"
                    id="cardholder"
                    placeholder="TARO YAMADA"
                    className={inputClass + " uppercase"}
                  />
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200"
                  >
                    <Lock className="w-4 h-4" />
                    {currentPlan.price}円/月 で申し込む
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-[var(--gia-deck-sub)]">
                  <Lock className="w-3 h-3" />
                  <span>SSL暗号化通信で安全に処理されます</span>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] p-8 lg:sticky lg:top-24">
              <SectionLabel>SUMMARY</SectionLabel>
              <h2 className="font-serif text-lg font-bold text-[var(--gia-deck-navy)] tracking-[0.03em] mt-1 mb-6">
                ご注文内容
              </h2>

              {/* Plan selector */}
              <div className="space-y-3 mb-8">
                {plans.map((plan) => {
                  const active = selectedPlan === plan.id;
                  return (
                    <label
                      key={plan.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors duration-200 ${
                        active
                          ? "border-[var(--gia-deck-navy)] bg-[var(--gia-deck-paper)]"
                          : "border-[var(--gia-deck-line)] hover:border-[var(--gia-deck-navy)]/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.id}
                        checked={active}
                        onChange={() => setSelectedPlan(plan.id)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          active
                            ? "border-[var(--gia-deck-navy)]"
                            : "border-[var(--gia-deck-line)]"
                        }`}
                      >
                        {active && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[var(--gia-deck-navy)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--gia-deck-navy)]">
                            {plan.name}
                          </span>
                          {plan.recommended && (
                            <span className="text-[10px] font-bold text-[var(--gia-deck-gold)] bg-[var(--gia-deck-gold)]/10 px-1.5 py-0.5 rounded tracking-wider">
                              おすすめ
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[var(--gia-deck-navy)] whitespace-nowrap">
                        ¥{plan.price}
                        <span className="text-xs font-normal text-[var(--gia-deck-sub)]">
                          /月
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="border-t border-[var(--gia-deck-line)] pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--gia-deck-sub)]">月額料金</span>
                  <span className="font-medium text-[var(--gia-deck-ink)]">
                    ¥{currentPlan.price}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--gia-deck-sub)]">税</span>
                  <span className="font-medium text-[var(--gia-deck-sub)]">
                    税込
                  </span>
                </div>
                <div className="border-t border-[var(--gia-deck-line)] pt-3 flex items-center justify-between">
                  <span className="font-bold text-[var(--gia-deck-navy)]">
                    合計（税込）
                  </span>
                  <span className="font-serif text-xl font-bold text-[var(--gia-deck-navy)]">
                    ¥{currentPlan.price}
                    <span className="text-sm font-normal text-[var(--gia-deck-sub)] font-sans">
                      /月
                    </span>
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6 p-4 bg-[var(--gia-deck-gold)]/8 border border-[var(--gia-deck-gold)]/30 rounded-xl">
                <p className="text-[12px] text-[var(--gia-deck-ink)] leading-[1.85]">
                  いつでも退会可能です。次回請求日まではサービスを引き続きご利用いただけます。日割り返金はございません。
                </p>
              </div>

              {/* Legal links */}
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--gia-deck-sub)]">
                <Link
                  href="/terms"
                  className="hover:text-[var(--gia-deck-navy)] underline underline-offset-4 decoration-[var(--gia-deck-line)] transition-colors"
                >
                  利用規約
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-[var(--gia-deck-navy)] underline underline-offset-4 decoration-[var(--gia-deck-line)] transition-colors"
                >
                  プライバシーポリシー
                </Link>
                <Link
                  href="/tokushoho"
                  className="hover:text-[var(--gia-deck-navy)] underline underline-offset-4 decoration-[var(--gia-deck-line)] transition-colors"
                >
                  特商法表記
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 内部コンポーネント / スタイル定数 ───────────────────────────────

function ChapterTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
      <span>{children}</span>
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em]">
      {children}
    </div>
  );
}

const inputClass =
  "block w-full rounded-lg border border-[var(--gia-deck-line)] bg-white px-3.5 py-3 text-sm text-[var(--gia-deck-ink)] placeholder:text-zinc-400 transition-colors focus:outline-none focus:border-[var(--gia-deck-navy)] focus:ring-1 focus:ring-[var(--gia-deck-gold)]/20";
