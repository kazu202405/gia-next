import { Metadata } from "next";
import { SalonLP } from "@/components/salon/salon-lp";

export const metadata: Metadata = {
  title: { absolute: "テラこや | これからの時代を生き抜く AIとお金について考える寺子屋" },
  description:
    "AIとお金を味方につけて、ビジネスと人生を前に進める。月1回の勉強会、AI活用とお金の教養を学ぶ実践講座、うまくいっている企業の事例研究、参加者同士の交流・紹介・協業マッチング、壁打ち相談会、リアル懇親会。経営者・個人事業主のための、月額10,000円の実践型コミュニティ「テラこや」。",
};

export default function MembersPage() {
  return <SalonLP />;
}
