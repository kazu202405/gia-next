import { Metadata } from "next";
import Link from "next/link";
import { MembersList } from "@/components/members/members-list";
import { MembersHero } from "@/components/members/members-hero";
import { Check, BookOpen, Calendar, MessageCircle, Shield, CreditCard } from "lucide-react";

export const metadata: Metadata = {
  title: "コミュニティへの参加 | ガイアの酒場",
  description:
    "ガイアの酒場は、志ある経営者が集う紹介制のオンラインコミュニティです。月額4,980円（税込）で、限定イベントやコンテンツへのアクセスが可能になります。",
};

const benefits = [
  {
    icon: Calendar,
    title: "限定イベント・セミナー",
    description:
      "業界のトップランナーを招いたセミナーや、メンバー同士の交流会に優先的にご参加いただけます。",
  },
  {
    icon: BookOpen,
    title: "限定オンラインコンテンツ",
    description:
      "ビジネスに役立つ限定記事や動画など、メンバーだけがアクセスできるコンテンツが見放題です。",
  },
  {
    icon: MessageCircle,
    title: "クローズドな交流",
    description:
      "Slackや専用SNSを通じて、他の経営者と気軽に情報交換や相談ができます。新たな協業やアイデアが生まれる場です。",
  },
];

export default function MembersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <MembersHero />

      {/* Members List Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              参加メンバー
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              多様な業界・分野で活躍する経営者が参加しています。
            </p>
          </div>
          <MembersList />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              メンバー特典
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              コミュニティに参加することで、以下の特典をご利用いただけます。
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center mb-6">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              参加プラン
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              月額のサブスクリプションプランです。いつでも退会可能です。
            </p>
          </div>

          {/* Pricing Card */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded-3xl blur-lg opacity-60" />

            <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              {/* Card Header */}
              <div className="bg-gray-900 px-8 py-10 sm:px-10">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                  <div>
                    <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                      Monthly Plan
                    </p>
                    <h3 className="text-2xl font-bold text-white">
                      ガイアの酒場 メンバーシップ
                    </h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg text-gray-400">&#165;</span>
                    <span className="text-5xl font-bold text-white tracking-tight">
                      4,980
                    </span>
                    <span className="text-gray-400 ml-1">/月（税込）</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="px-8 py-10 sm:px-10">
                {/* Feature List */}
                <div className="space-y-4 mb-10">
                  {[
                    "限定イベント・セミナーへの参加",
                    "限定オンラインコンテンツの閲覧",
                    "Slack・専用SNSでの交流",
                    "メンバー限定の情報共有",
                    "新規メンバーの紹介権利",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="space-y-4">
                  <Link
                    href="/join"
                    className="flex items-center justify-center gap-2 w-full px-8 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors text-lg"
                  >
                    登録手続きに進む
                  </Link>
                  <p className="text-center text-sm text-gray-500">
                    ご参加には既存メンバーからの紹介が必要です
                  </p>
                </div>

                {/* Payment & Policy Info */}
                <div className="mt-10 pt-8 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-gray-500">
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">お支払い方法</p>
                        <p>クレジットカード決済（Stripe）</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-700">
                          退会・キャンセル
                        </p>
                        <p>いつでも退会可能。次回請求日まで利用可。日割り返金なし。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Links */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <Link
              href="/terms"
              className="hover:text-gray-900 transition-colors underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900"
            >
              利用規約
            </Link>
            <Link
              href="/privacy"
              className="hover:text-gray-900 transition-colors underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900"
            >
              プライバシーポリシー
            </Link>
            <Link
              href="/tokushoho"
              className="hover:text-gray-900 transition-colors underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900"
            >
              特定商取引法に基づく表記
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
