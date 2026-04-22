import { Metadata } from "next";
import { SalonLP } from "@/components/salon/salon-lp";

export const metadata: Metadata = {
  title: { absolute: "オンラインサロン | GIAの酒場" },
  description:
    "印象、距離感、伝え方。心理学×AIで「選ばれる理由」を整えるオンラインサロン。行動心理に基づいたコミュニケーションと魅力設計を学べます。",
};

export default function MembersPage() {
  return <SalonLP />;
}
