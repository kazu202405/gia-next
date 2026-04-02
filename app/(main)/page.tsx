import type { Metadata } from "next";
import { Hero } from "@/components/sections/hero";
import { Challenges } from "@/components/sections/challenges";
import { BehavioralProblem } from "@/components/behavioral/behavioral-problem";
import { BehavioralServices } from "@/components/behavioral/behavioral-services";
import { BehavioralMidCta } from "@/components/behavioral/behavioral-mid-cta";
import { BehavioralCurriculum } from "@/components/behavioral/behavioral-curriculum";
import { WorksStack } from "@/components/sections/works-stack";
import { About } from "@/components/sections/about";
import { Faq } from "@/components/sections/faq";
import { BehavioralCta } from "@/components/behavioral/behavioral-cta";
import { BehavioralDiagnostic } from "@/components/behavioral/behavioral-diagnostic";

export const metadata: Metadata = {
  title: "GIA | AI時代に選ばれる理由をつくる",
  description:
    "人にしかできない価値を最大化し、選ばれる理由を設計する。心理学とAIを活かし、社長の左腕として右腕や現場とも伴走しながら、思考と事業を整えます。",
  alternates: {
    canonical: "/",
  },
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gia2018.com";

function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GIA - Global Information Academy",
    url: siteUrl,
    logo: `${siteUrl}/gia-logo.png`,
    description:
      "人にしかできない価値を最大化し、選ばれる理由を設計する伴走型パートナー",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: "Japanese",
    },
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "選ばれる理由設計サービス",
    provider: {
      "@type": "Organization",
      name: "GIA - Global Information Academy",
    },
    description:
      "属人的な業務を仕組み化し、人にしかできない価値を最大化。選ばれる理由を設計する伴走型サービス",
    serviceType: "選ばれる理由設計・業務仕組み化・DX支援",
    areaServed: {
      "@type": "Country",
      name: "Japan",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "JPY",
      description: "無料相談",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "AIに詳しくなくても相談できますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "もちろんです。GIAは「何から手をつけていいかわからない」という方のための相談窓口です。AIの知識は不要です。",
        },
      },
      {
        "@type": "Question",
        name: "相談したら必ず契約しないといけませんか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "いいえ。無料相談は「現状の整理」が目的です。相談した結果、自社で対応できそうだと思えばそれで大丈夫です。押し売りは一切しません。",
        },
      },
      {
        "@type": "Question",
        name: "どんな業種・規模に対応していますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "業務フローが整っていない企業であれば、規模を問わずサポートできます。飲食、建設、商社など、さまざまな業界に対応できます。",
        },
      },
      {
        "@type": "Question",
        name: "費用はどのくらいかかりますか？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "一般的なコンサルティングは月額30〜50万円が相場ですが、GIAは仕組み化支援に特化しているため月額5万円〜からご相談いただけます。",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}

export default function Home() {
  return (
    <>
      <JsonLd />

      {/* AIホットライン：ヒーロー */}
      <Hero />

      {/* 悩み共感 */}
      <Challenges />

      {/* AIホットラインの特徴 */}
      <BehavioralProblem />

      {/* 対応できること */}
      <BehavioralServices />

      {/* 支援の流れ */}
      <BehavioralCurriculum />

      {/* AI準備度診断 */}
      <BehavioralDiagnostic />

      {/* 信頼（実績→中間CTA→代表） */}
      <WorksStack />
      <BehavioralMidCta />
      <About />

      {/* よくある質問・最終CTA */}
      <Faq />
      <BehavioralCta />
    </>
  );
}
