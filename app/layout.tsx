import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gia2018.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AIホットライン | GIA - そのAI、まだ早いかもしれません",
    template: "%s | GIA",
  },
  description:
    "そのAI、本当に必要ですか？AIホットラインは、業務整理からAI活用設計・DX・システム開発まで一気通貫で伴走する相談窓口です。まず整理する。AIはそのあとでいい。",
  keywords: [
    "AI導入",
    "業務整理",
    "DX支援",
    "業務フロー",
    "AI活用",
    "中小企業",
    "業務効率化",
    "システム開発",
    "AIホットライン",
    "AI相談",
  ],
  authors: [{ name: "GIA - Global Information Academy" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "GIA - AIホットライン",
    title: "AIホットライン | そのAI、まだ早いかもしれません",
    description:
      "そのAI、本当に必要ですか？業務整理からAI活用設計・DX・システム開発まで一気通貫で伴走します。",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "AIホットライン - そのAI、まだ早いかもしれません",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIホットライン | そのAI、まだ早いかもしれません",
    description:
      "そのAI、本当に必要ですか？業務整理からDX・システム開発まで一気通貫で伴走します。",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerifJP.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
