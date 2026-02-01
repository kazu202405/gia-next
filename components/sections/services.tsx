import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    title: "価値に寄り添う\nホームページ制作",
    description: "想いをかたちに。仕組みを組み込み、\n価値を伝えるホームページを制作いたします。",
    image: "/images/services/homepage.jpg",
  },
  {
    title: "現場を変える\nDXシステム開発",
    description: "業務を効率化し、属人的な作業を軽減。\n人の力を最大限に活かし、成果へつなげるDXシステムを開発します。",
    image: "/images/services/dx-system.jpg",
  },
  {
    title: "人と仕組みに寄り添う\nコンサルティング",
    description: "人の力と仕組みの両方に目を向け、\n持続的に成果を生み出す基盤づくりをお手伝いします。",
    image: "/images/services/consulting.jpg",
  },
];

export function Services() {
  return (
    <section id="services" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            私たちのサービス
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            対話を通じてシステムと人の力をつなぎ、<br />
            ビジネスが成長する仕組みをともにつくります。
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card
              key={index}
              className="overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative h-[220px]">
                <Image
                  src={service.image}
                  alt={service.title.replace("\n", " ")}
                  fill
                  className="object-cover"
                />
              </div>
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-bold text-slate-800 mb-4 whitespace-pre-line">
                  {service.title}
                </h3>
                <p className="text-base text-slate-500 leading-relaxed whitespace-pre-line">
                  {service.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
