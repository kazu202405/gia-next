import { Metadata } from "next";
import { GourmetHero } from "@/components/gourmet/gourmet-hero";
import { GourmetProblem } from "@/components/gourmet/gourmet-problem";
import { GourmetConcept } from "@/components/gourmet/gourmet-concept";
import { GourmetHow } from "@/components/gourmet/gourmet-how";
import { GourmetFeatures } from "@/components/gourmet/gourmet-features";
import { GourmetUseCases } from "@/components/gourmet/gourmet-usecases";
import { GourmetCta } from "@/components/gourmet/gourmet-cta";

export const metadata: Metadata = {
  title: "グルメサークル | ガイアの酒場",
  description:
    "信頼できる人の紹介だけで、お店を知れる世界。星の数でも匿名レビューでもなく、「この人が薦めるなら間違いない」そんな出会い方がここにあります。",
};

export default function GourmetPage() {
  return (
    <div className="min-h-screen bg-white">
      <GourmetHero />
      <GourmetProblem />
      <GourmetConcept />
      <GourmetHow />
      <GourmetFeatures />
      <GourmetUseCases />
      <GourmetCta />
    </div>
  );
}
