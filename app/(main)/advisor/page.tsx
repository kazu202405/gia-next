import { Metadata } from "next";
import { AdvisorApp } from "@/components/advisor/advisor-app";

export const metadata: Metadata = {
  title: "AI行動科学アドバイザー | GIA",
  description:
    "行動心理学・脳科学・行動経済学の専門AIに、組織の課題や意思決定の改善について相談できます。",
};

export default function AdvisorPage() {
  return <AdvisorApp />;
}
