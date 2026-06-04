import { Metadata } from "next";
import { SalonLP } from "@/components/salon/salon-lp";

export const metadata: Metadata = {
  title: { absolute: "オンラインサロン | 紹介設計研究所" },
  description:
    "今日の学びを覚えた紹介コーチAIに24時間相談、勉強会・懇親会、情報アーカイブ。紹介を仕組みにする、紹介設計研究所のオンラインサロンです。",
};

export default function MembersPage() {
  return <SalonLP />;
}
