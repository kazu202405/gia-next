import { Metadata } from "next";
import { MembersList } from "@/components/members/members-list";

export const metadata: Metadata = {
  title: "メンバー紹介 | ガイアの酒場",
  description:
    "ガイアの酒場に集う経営者たちのストーリー。志ある経営者同士が能力と人脈を持ち寄り、課題解決と価値創造を共に行う仲間たちをご紹介します。",
};

export default function MembersPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              メンバー紹介
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              ガイアの酒場には、様々な業界で活躍する経営者が集まっています。
              <br className="hidden sm:block" />
              それぞれが持つ独自のストーリーと専門性を通じて、
              <br className="hidden sm:block" />
              新たな価値を共創する仲間たちです。
            </p>
          </div>
        </div>
      </section>

      {/* Members List Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <MembersList />
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              志ある経営者との出会いを
            </h2>
            <p className="text-gray-400 mb-8">
              ガイアの酒場は、紹介制の経営者コミュニティです。
              <br />
              まずはお気軽にお問い合わせください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/join"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                入会について
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-3 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                お問い合わせ
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
