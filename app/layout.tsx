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
    default: "GIA | AI時代に選ばれる理由をつくる",
    template: "%s | GIA",
  },
  description:
    "人にしかできない価値を最大化し、選ばれる理由を設計する。心理学とAIを活かし、社長の左腕として右腕や現場とも伴走しながら、思考と事業を整えます。",
  keywords: [
    "選ばれる理由",
    "人の価値最大化",
    "業務整理",
    "DX支援",
    "AI活用",
    "中小企業",
    "属人化解消",
    "仕組み化",
    "社長の左腕",
    "経営伴走",
  ],
  authors: [{ name: "GIA - Global Information Academy" }],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "GIA - 選ばれる理由をつくる",
    title: "GIA | AI時代に選ばれる理由をつくる",
    description:
      "人にしかできない価値を最大化し、選ばれる理由を設計する。社長の左腕として、思考と事業を整えます。",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "GIA - AI時代に選ばれる理由をつくる",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GIA | AI時代に選ばれる理由をつくる",
    description:
      "人にしかできない価値を最大化し、選ばれる理由を設計する。社長の左腕として伴走します。",
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
