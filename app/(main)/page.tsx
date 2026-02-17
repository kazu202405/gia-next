import { Hero } from "@/components/sections/hero";
import { PainPoints } from "@/components/sections/pain-points";
import { WhyStuck } from "@/components/sections/why-stuck";
import { Transformation } from "@/components/sections/transformation";
import { ProgramFlow } from "@/components/sections/program-flow";
import { SecretSauce } from "@/components/sections/secret-sauce";
import { WorksStack } from "@/components/sections/works-stack";
import { About } from "@/components/sections/about";
import { Faq } from "@/components/sections/faq";
import { CtaSection } from "@/components/sections/cta-section";

export default function Home() {
  return (
    <>
      {/* 注目 */}
      <Hero />

      {/* 問題認識 */}
      <PainPoints />
      <WhyStuck />

      {/* 解決策 */}
      <Transformation />
      <ProgramFlow />
      <SecretSauce />

      {/* 信頼 */}
      <WorksStack />
      <About />

      {/* 行動 */}
      <Faq />
      <CtaSection />
    </>
  );
}
