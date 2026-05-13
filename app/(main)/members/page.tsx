import { Metadata } from "next";
import { SalonLP } from "@/components/salon/salon-lp";

export const metadata: Metadata = {
  title: { absolute: "オンラインサロン | GIAの酒場" },
  description:
    "紹介で動く、人脈の場。メンバー人脈の閲覧、紹介コーチAI、メンバー間の紹介依頼を、AIと心理学で仕組みにするGIAのオンラインサロン。",
};

export default function MembersPage() {
  return <SalonLP />;
}
