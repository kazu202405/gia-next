"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, CreditCard, Lock, Check } from "lucide-react";

const plans = [
  { id: "light", name: "ライトプラン", price: "1,980" },
  { id: "standard", name: "スタンダードプラン", price: "3,980", recommended: true },
  { id: "premium", name: "プレミアムプラン", price: "4,980" },
];

export default function CheckoutPage() {
  const [selectedPlan, setSelectedPlan] = useState("standard");
  const [submitted, setSubmitted] = useState(false);

  const currentPlan = plans.find((p) => p.id === selectedPlan)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-24 pb-16 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            お申し込みありがとうございます
          </h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            現在、決済機能を準備中です。
            <br />
            サービス開始時にご登録のメールアドレスへご案内いたします。
            <br />
            もうしばらくお待ちください。
          </p>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
          >
            ダッシュボードへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/join"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          登録情報の入力に戻る
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Payment form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    お支払い情報
                  </h1>
                  <p className="text-sm text-gray-500">
                    クレジットカード情報を入力してください
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Card number */}
                <div>
                  <label
                    htmlFor="card-number"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    カード番号
                  </label>
                  <input
                    type="text"
                    id="card-number"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                  />
                </div>

                {/* Expiry & CVC */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="expiry"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      有効期限
                    </label>
                    <input
                      type="text"
                      id="expiry"
                      placeholder="MM / YY"
                      maxLength={7}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cvc"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      セキュリティコード
                    </label>
                    <input
                      type="text"
                      id="cvc"
                      placeholder="123"
                      maxLength={4}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Cardholder name */}
                <div>
                  <label
                    htmlFor="cardholder"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    カード名義人
                  </label>
                  <input
                    type="text"
                    id="cardholder"
                    placeholder="TARO YAMADA"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm uppercase"
                  />
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
                  >
                    <Lock className="w-4 h-4" />
                    {currentPlan.price}円/月 で申し込む
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Lock className="w-3 h-3" />
                  <span>SSL暗号化通信で安全に処理されます</span>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Order summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-6">
                ご注文内容
              </h2>

              {/* Plan selector */}
              <div className="space-y-3 mb-8">
                {plans.map((plan) => (
                  <label
                    key={plan.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      selectedPlan === plan.id
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={selectedPlan === plan.id}
                      onChange={() => setSelectedPlan(plan.id)}
                      className="sr-only"
                    />
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedPlan === plan.id
                          ? "border-gray-900"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedPlan === plan.id && (
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {plan.name}
                        </span>
                        {plan.recommended && (
                          <span className="text-[10px] font-bold text-white bg-gray-900 px-1.5 py-0.5 rounded">
                            おすすめ
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                      ¥{plan.price}
                      <span className="text-xs font-normal text-gray-500">
                        /月
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {/* Summary */}
              <div className="border-t border-gray-200 pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">月額料金</span>
                  <span className="font-medium text-gray-900">
                    ¥{currentPlan.price}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">税</span>
                  <span className="font-medium text-gray-500">税込</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                  <span className="font-bold text-gray-900">合計（税込）</span>
                  <span className="text-xl font-bold text-gray-900">
                    ¥{currentPlan.price}
                    <span className="text-sm font-normal text-gray-500">
                      /月
                    </span>
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 leading-relaxed">
                  いつでも退会可能です。次回請求日まではサービスを引き続きご利用いただけます。日割り返金はございません。
                </p>
              </div>

              {/* Legal links */}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                <Link
                  href="/terms"
                  className="hover:text-gray-700 underline underline-offset-2"
                >
                  利用規約
                </Link>
                <Link
                  href="/privacy"
                  className="hover:text-gray-700 underline underline-offset-2"
                >
                  プライバシーポリシー
                </Link>
                <Link
                  href="/tokushoho"
                  className="hover:text-gray-700 underline underline-offset-2"
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
