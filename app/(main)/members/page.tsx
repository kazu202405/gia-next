import { Metadata } from "next";
import { SalonLP } from "@/components/salon/salon-lp";

export const metadata: Metadata = {
  title: { absolute: "寺子屋コミュニティ | ビジネスが加速する学びと仲間の場" },
  description:
    "うまくいっている企業の事例研究、月1回の勉強会、参加者同士の交流・紹介・協業マッチング、壁打ち相談会、リアル懇親会。経営・ビジネスの考え方を学びながら、自分の商売に活かせるヒントと前向きな仲間が見つかる、月額4,980円の寺子屋コミュニティです。",
};

export default function MembersPage() {
  return <SalonLP />;
}
