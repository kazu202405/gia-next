// /upgrade ルートのレイアウト。
// 配下の page.tsx が client component（"use client"）のため、metadata はここから export する。
// ルート全体に作用させたいわけではなく、このディレクトリ配下のページタイトルを統一する目的。

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "有料会員登録 | 紹介設計研究所" },
};

export default function UpgradeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
