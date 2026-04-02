import Link from "next/link";

interface FooterProps {
  variant?: "default" | "dark";
}

export function Footer({ variant = "default" }: FooterProps) {
  const bgColor = variant === "dark" ? "bg-[#2a2a28]" : "bg-[#0f1f33]";

  return (
    <footer className={`${bgColor} text-white pt-16 pb-6`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ブランドメッセージ */}
        <div className="mb-12 max-w-lg">
          <h3 className="font-[family-name:var(--font-noto-serif-jp)] text-2xl font-semibold mb-3">
            GIA
          </h3>
          <p className="text-sm text-white/50 leading-relaxed">
            AI時代に選ばれる理由をつくる。
            <br />
            人にしかできない価値を最大化し、社長の左腕として伴走します。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* 会社情報 */}
          <div className="md:col-span-1">
            <h4 className="text-sm font-bold tracking-widest text-white/70 mb-4 uppercase">
              Company
            </h4>
            <p className="text-sm text-white/50 leading-relaxed">
              株式会社Global Information Academy
              <br />
              〒531-0056
              <br />
              大阪市中央区久太郎町1-7-11
            </p>
            <p className="text-sm text-white/40 mt-3">
              global.information.academy[at]gmail.com
            </p>
          </div>

          {/* サービス */}
          <div>
            <h4 className="text-sm font-bold tracking-widest text-white/70 mb-4 uppercase">
              Service
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a href="/#services" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  選ばれる理由設計
                </a>
              </li>
              <li>
                <a href="/#services" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  業務整理・仕組み化
                </a>
              </li>
              <li>
                <a href="/#services" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  DX・システム開発
                </a>
              </li>
              <li>
                <Link href="/services/space" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  空間・建築デザイン
                </Link>
              </li>
            </ul>
          </div>

          {/* リソース */}
          <div>
            <h4 className="text-sm font-bold tracking-widest text-white/70 mb-4 uppercase">
              Resource
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/behavioral-science" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  ナレッジ
                </Link>
              </li>
              <li>
                <Link href="/members" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  コミュニティ
                </Link>
              </li>
              <li>
                <Link href="/diagnostic" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  仕組み化診断
                </Link>
              </li>
            </ul>
          </div>

          {/* 法的情報 */}
          <div>
            <h4 className="text-sm font-bold tracking-widest text-white/70 mb-4 uppercase">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/terms" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/tokushoho" className="text-sm text-white/50 hover:text-[#2d8a80] transition-colors">
                  特定商取引法に基づく表記
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 区切り線 + コピーライト */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} Global Information Academy. All rights reserved.
          </p>
          <a
            href="https://page.line.me/131liqrt"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#2d8a80]/70 hover:text-[#2d8a80] transition-colors"
          >
            LINEで無料相談 →
          </a>
        </div>
      </div>
    </footer>
  );
}
