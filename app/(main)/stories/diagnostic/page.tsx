import { Metadata } from "next";
import { DiagnosticApp } from "@/components/behavioral/diagnostic-app";

export const metadata: Metadata = {
  title: "組織行動診断 | GIA",
  description:
    "18問の設問で6領域をスコアリング。あなたの組織の「行動の癖」を可視化し、改善のヒントをお届けします。所要時間約7分、登録不要。",
};

export default function DiagnosticPage() {
  return <DiagnosticApp />;
}
