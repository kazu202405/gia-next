import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemberBySlug, getPublishedMembers } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, MessageCircle, Share2 } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const members = getPublishedMembers();
  return members.map((member) => ({
    slug: member.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const member = getMemberBySlug(slug);

  if (!member) {
    return {
      title: "メンバーが見つかりません | ガイアの酒場",
    };
  }

  return {
    title: `${member.name} | ガイアの酒場`,
    description: `${member.headline} - ${member.storyOrigin.slice(0, 100)}...`,
    openGraph: {
      title: `${member.name} | ガイアの酒場`,
      description: member.headline,
      images: [member.photoUrl],
    },
  };
}

export default async function MemberDetailPage({ params }: Props) {
  const { slug } = await params;
  const member = getMemberBySlug(slug);

  if (!member) {
    notFound();
  }

  const storyBlocks = [
    { title: "起点", content: member.storyOrigin },
    { title: "転機", content: member.storyTurningPoint },
    { title: "今", content: member.storyNow },
    { title: "未来", content: member.storyFuture },
  ];

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-100 to-white h-full" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          {/* Back link */}
          <Link
            href="/members"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            メンバー一覧へ戻る
          </Link>

          {/* Profile header */}
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            {/* Photo */}
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shadow-xl flex-shrink-0">
              <Image
                src={member.photoUrl}
                alt={member.name}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                {member.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="bg-gray-200/80 text-gray-700"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                {member.name}
              </h1>

              <p className="text-gray-600 mb-4">
                {member.roleTitle} / {member.jobTitle}
              </p>

              <p className="text-xl text-gray-800 font-medium leading-relaxed">
                {member.headline}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">ストーリー</h2>

        <div className="space-y-10">
          {storyBlocks.map((block, index) => (
            <div key={block.title} className="relative pl-8 sm:pl-12">
              {/* Timeline dot */}
              <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-bold">
                {index + 1}
              </div>

              {/* Timeline line */}
              {index < storyBlocks.length - 1 && (
                <div className="absolute left-[11px] top-8 w-0.5 h-full bg-gray-200" />
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {block.title}
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {block.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            提供サービス
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {member.servicesSummary}
          </p>

          {/* Contact Links */}
          {member.allowDirectContact && Object.keys(member.contactLinks).length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                お問い合わせ
              </h3>
              <div className="flex flex-wrap gap-3">
                {member.contactLinks.site && (
                  <a
                    href={member.contactLinks.site}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <Globe className="h-4 w-4" />
                    ウェブサイト
                  </a>
                )}
                {member.contactLinks.line && (
                  <a
                    href={member.contactLinks.line}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#06C755] text-white rounded-lg hover:bg-[#05b34c] transition-all"
                  >
                    <MessageCircle className="h-4 w-4" />
                    LINE
                  </a>
                )}
                {member.contactLinks.sns && (
                  <a
                    href={member.contactLinks.sns}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <Share2 className="h-4 w-4" />
                    SNS
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              {member.name}さんのような仲間と出会いませんか？
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              ガイアの酒場は、志ある経営者が集い、課題解決と価値創造を共に行う場です。
              紹介制のコミュニティだからこそ生まれる、質の高いつながりがあります。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/join"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
              >
                入会について詳しく見る
              </a>
              <Link
                href="/members"
                className="inline-flex items-center justify-center px-8 py-3 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                他のメンバーを見る
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
