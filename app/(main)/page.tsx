import { Hero } from "@/components/sections/hero";
import { Challenges } from "@/components/sections/challenges";
import { BehavioralProblem } from "@/components/behavioral/behavioral-problem";
import { BehavioralServices } from "@/components/behavioral/behavioral-services";
import { BehavioralMidCta } from "@/components/behavioral/behavioral-mid-cta";
import { BehavioralCurriculum } from "@/components/behavioral/behavioral-curriculum";
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
      <Challenges />

      {/* 行動設計の提案 */}
      <BehavioralProblem />
      <BehavioralServices />

      {/* 中間CTA（軽量ライトテーマ） */}
      <BehavioralMidCta />

      {/* プログラム */}
      <BehavioralCurriculum />

      {/* 信頼 */}
      <WorksStack />
      <About />

      {/* 行動 */}
      <Faq />
      <BehavioralCta />
    </>
  );
}
