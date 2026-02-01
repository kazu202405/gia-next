import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function About() {
  return (
    <section id="about" className="py-24 md:py-32 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative h-[400px] md:h-[480px] rounded-2xl overflow-hidden">
            <Image
              src="/images/about.jpg"
              alt="私たちについて"
              fill
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-6">
              私たちについて
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-6">
              私たち株式会社Global Information Academy（GIA）は、<br />
              「人の力を引き出す」を合言葉に、システム開発と<br />
              心理学・脳科学の知見を融合させ、仕組みと人の成長の<br />
              両面からビジネスを支えるDXパートナーです。
            </p>
            <p className="text-lg text-slate-600 leading-relaxed mb-8">
              単なる仕組みづくりではなく、経営者や現場の声に寄り添い、<br />
              人の力が最大限に活きる環境をともに築きます。<br />
              技術と心理の両面から、お客様のビジネスを次のステージへ導きます。
            </p>
            <Button asChild variant="outline" size="lg" className="text-slate-800 border-slate-800">
              <Link href="/about">
                詳しく見る
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative Triangle */}
      <div
        className="absolute bottom-0 right-0 w-[min(34vw,520px)] h-[min(34vw,520px)] opacity-90 pointer-events-none hidden md:block"
        style={{
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 41, 59, 0.12) 100%)",
          clipPath: "polygon(100% 0%, 100% 100%, 0% 100%)",
          backdropFilter: "blur(8px)",
        }}
      />
    </section>
  );
}
