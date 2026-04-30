// /upgrade/checkout ルートのレイアウト。
// 配下の page.tsx が client component（"use client"）のため、metadata はここから export する。
// 親 /upgrade/layout.tsx の title を子側で上書きする目的。

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "お支払い情報 | GIAの酒場" },
};

export default function UpgradeCheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
