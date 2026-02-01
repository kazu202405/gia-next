import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const works = [
  {
    title: "査定・見積り自動化と顧客育成の基盤づくり",
    industry: "飲食店専門の不動産会社",
    summary:
      "紙で行っていた査定・見積りをシステム化。顧客情報を一元管理し、顧客の育成フローも組み込み。現在は共同で、飲食店向けの共同サービスを構築中。",
    outcomes: ["査定・見積りの自動化", "顧客一元管理", "共同サービス展開"],
    tags: ["DX化", "業務自動化", "顧客育成"],
    image: "/images/works/work1.jpg",
  },
  {
    title: "営業データの一元化と見える化",
    industry: "省エネコンサルティング会社",
    summary:
      "上場企業もクライアントにもつ会社だったが、社内データが分散。顧客管理・営業管理を統合し、仕組みで経営・人材育成ができるようにサポート。",
    outcomes: ["データ一元化", "ダッシュボード化", "営業育成の仕組み化"],
    tags: ["一元化", "営業管理", "顧客管理"],
    image: "/images/works/work2.jpg",
  },
  {
    title: "AI活用で社内業務を効率化＋EC/HP支援",
    industry: "美容用品商社",
    summary:
      "業務フローにAIを導入することで社内の定型業務を効率化。また、ブランドの価値が伝わるホームページ制作も支援し、運用しやすい体制へ。",
    outcomes: ["AI導入", "業務効率化", "HP制作"],
    tags: ["AI活用", "業務効率化", "EC/HP"],
    image: "/images/works/work3.jpg",
  },
  {
    title: "申請業務の一元化とAIによる計画書作成",
    industry: "補助金申請会社",
    summary:
      "スプレッドシート/フォーム運用を脱却し、申請情報を一元管理。AIを組み合わせて事業計画書の下書きを自動生成、日常業務の効率化を実現。",
    outcomes: ["情報一元化", "AIで計画書下書き", "業務効率化"],
    tags: ["一元化", "AI活用", "申請業務"],
    image: "/images/works/work4.jpg",
  },
  {
    title: "経営の見える化と仕組み化の伴走支援",
    industry: "高圧電気工事会社（大阪メトロ等）",
    summary:
      "上場企業と仕事されている中でも事務作業が煩雑であった。AI活用だけでなく、経営の効率化・見える化・役割設計など「仕組み化」を中心に伴走。",
    outcomes: ["見える化", "役割設計", "運営体制の最適化"],
    tags: ["仕組み化", "経営効率", "伴走支援"],
    image: "/images/works/work5.jpg",
  },
  {
    title: "共同サービス構築に向けたDXの土台づくり",
    industry: "公共工事会社（自衛隊関連等）",
    summary:
      "航空・海上自衛隊の案件等、公共工事を扱う会社のDX化。将来の共同サービス展開を見据え、アライアンスを組み、工事会社のシステム化を進行中。",
    outcomes: ["DX基盤", "アライアンス", "共同サービス準備"],
    tags: ["DX基盤", "公共", "アライアンス"],
    image: "/images/works/work6.jpg",
  },
];

export function Works() {
  return (
    <section id="works" className="py-24 md:py-32 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-800 mb-6">
            実績
          </h2>
          <p className="text-lg text-slate-500 leading-relaxed">
            実際にお手伝いしたプロジェクトの事例とストーリーをいくつかご紹介します
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {works.map((work, index) => (
            <Card
              key={index}
              className="overflow-hidden h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
            >
              {/* Image with Tags */}
              <div className="relative h-[200px]">
                <Image
                  src={work.image}
                  alt={work.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                  {work.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-white/90 text-slate-700 text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <CardContent className="p-6">
                <p className="text-sm font-semibold text-slate-600 mb-1">
                  {work.industry}
                </p>
                <h4 className="text-lg font-bold text-slate-800 mb-3 leading-snug">
                  {work.title}
                </h4>
                <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-4">
                  {work.summary}
                </p>

                {/* Outcomes */}
                <div className="flex flex-nowrap gap-2">
                  {work.outcomes.map((outcome) => (
                    <Badge key={outcome} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      {outcome}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-[120px] overflow-hidden z-[1]">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,40 Q360,100 720,40 T1440,40 L1440,120 L0,120 Z" fill="#0f1f33" />
        </svg>
      </div>

      <div className="h-[140px]" />
    </section>
  );
}
