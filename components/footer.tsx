import Link from "next/link";

interface FooterProps {
  variant?: "default" | "dark";
}

export function Footer({ variant = "default" }: FooterProps) {
  const bgColor = variant === "dark" ? "bg-[#2a2a28]" : "bg-[#0f1f33]";

  return (
    <footer className={`${bgColor} text-white pt-16 pb-6`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* 会社情報 */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-semibold mb-4">Global Information Academy</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              〒531-0056 大阪市中央区久太郎町1-7-11
              <br />
              メール: global.information.academy[at]gmail.com
            </p>
          </div>

          {/* サービス */}
          <div>
            <h4 className="text-base font-semibold mb-3">サービス</h4>
            <ul className="space-y-2">
              <li>
                <a href="/#services" className="text-sm text-white/80 hover:text-white transition-opacity">
                  DX・システム開発
                </a>
              </li>
              <li>
                <Link href="/services/space" className="text-sm text-white/80 hover:text-white transition-opacity">
                  空間・建築デザイン
                </Link>
              </li>
              <li>
                <a href="/#services" className="text-sm text-white/80 hover:text-white transition-opacity">
                  伴走支援・コンサルティング
                </a>
              </li>
            </ul>
          </div>

          {/* 法的情報 */}
          <div>
            <h4 className="text-base font-semibold mb-3">法的情報</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-sm text-white/80 hover:text-white transition-opacity">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-white/80 hover:text-white transition-opacity">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/tokushoho" className="text-sm text-white/80 hover:text-white transition-opacity">
                  特定商取引法に基づく表記
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 区切り線 */}
        <div className="border-t border-white/20 my-6" />

        {/* コピーライト */}
        <div className="text-center">
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Global Information Academy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
