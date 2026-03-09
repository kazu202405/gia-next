import { Suspense } from "react";
import { Metadata } from "next";
import { DiagnosticApp } from "@/components/behavioral/diagnostic-app";

export const metadata: Metadata = {
  title: "AI準備度診断 | AIホットライン - GIA",
  description:
    "18問の設問で6領域をチェック。あなたの会社はAIを入れる前に何を整理すべきか、具体的なヒントをお届けします。所要時間約3分、登録不要。",
};

export default function DiagnosticPage() {
  return (
    <Suspense>
      <DiagnosticApp />
    </Suspense>
  );
}
