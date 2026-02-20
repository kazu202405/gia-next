import { Metadata } from "next";
import { BehavioralHero } from "@/components/behavioral/behavioral-hero";
import { BehavioralProblem } from "@/components/behavioral/behavioral-problem";
import { BehavioralServices } from "@/components/behavioral/behavioral-services";
import { BehavioralDiagnostic } from "@/components/behavioral/behavioral-diagnostic";
import { BehavioralCurriculum } from "@/components/behavioral/behavioral-curriculum";
import { BehavioralJourney } from "@/components/behavioral/behavioral-journey";
import { BehavioralPhilosophy } from "@/components/behavioral/behavioral-philosophy";
import { BehavioralCta } from "@/components/behavioral/behavioral-cta";

export const metadata: Metadata = {
  title: "行動科学コンサルティング | GIA",
  description:
    "行動科学で、経営の解像度を上げる。人は「正しいこと」では動かない。行動科学に基づく仕組みで、組織の行動を自然に変える。3分の無料診断から始めませんか？",
};

export default function BehavioralSciencePage() {
  return (
    <div className="min-h-screen bg-[#0f1f33]">
      <BehavioralHero />
      <BehavioralProblem />
      <BehavioralServices />
      <BehavioralDiagnostic />
      <BehavioralCurriculum />
      <BehavioralJourney />
      <BehavioralPhilosophy />
      <BehavioralCta />
    </div>
  );
}
