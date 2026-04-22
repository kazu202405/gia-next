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
    default: "GIA | 現場で回る仕組みを、アプリで実装する",
    template: "%s | GIA",
  },
  description:
    "顧客管理・営業支援アプリを、設計から現場運用まで一気通貫で実装。「作って終わり」にしない、伴走型の開発パートナー。",
  keywords: [
    "顧客管理アプリ",
    "営業支援アプリ",
    "業務仕組み化",
    "アプリ開発",
    "伴走型開発",
    "DX支援",
    "中小企業",
    "現場運用",
    "属人化解消",
    "AI活用",
  ],
  authors: [{ name: "GIA - Global Information Academy" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "GIA - 現場で回る仕組みを、アプリで実装する",
    title: "GIA | 現場で回る仕組みを、アプリで実装する",
    description:
      "顧客管理・営業支援アプリを、設計から現場運用まで一気通貫で実装。「作って終わり」にしない、伴走型の開発パートナー。",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GIA - 現場で回る仕組みを、アプリで実装する",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GIA | 現場で回る仕組みを、アプリで実装する",
    description:
      "顧客管理・営業支援アプリを、設計から現場運用まで一気通貫で実装。伴走型の開発パートナー。",
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
