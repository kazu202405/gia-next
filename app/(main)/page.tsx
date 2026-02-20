import { Hero } from "@/components/sections/hero";
import { PainPoints } from "@/components/sections/pain-points";
import { WhyStuck } from "@/components/sections/why-stuck";
import { BehavioralProblem } from "@/components/behavioral/behavioral-problem";
import { BehavioralServices } from "@/components/behavioral/behavioral-services";
import { BehavioralDiagnostic } from "@/components/behavioral/behavioral-diagnostic";
import { BehavioralCurriculum } from "@/components/behavioral/behavioral-curriculum";
import { BehavioralPhilosophy } from "@/components/behavioral/behavioral-philosophy";
import { WorksStack } from "@/components/sections/works-stack";
import { About } from "@/components/sections/about";
import { Faq } from "@/components/sections/faq";
import { BehavioralCta } from "@/components/behavioral/behavioral-cta";

export default function Home() {
  return (
    <>
      {/* 注目 */}
      <Hero />

      {/* 問題認識 */}
      <PainPoints />
      <WhyStuck />

      {/* 行動設計の提案 */}
      <BehavioralProblem />
      <BehavioralServices />

      {/* 診断 → プログラム → 哲学 */}
      <BehavioralDiagnostic />
      <BehavioralCurriculum />
      <BehavioralPhilosophy />

      {/* 信頼 */}
      <WorksStack />
      <About />

      {/* 行動 */}
      <Faq />
      <BehavioralCta />
    </>
  );
}
