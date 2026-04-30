"use client";

/**
 * Service — Editorial 6軸 TOC リスト
 * 番号 / 明朝サービス名 / 説明 / 矢印の4列構造。
 * Hover で gold gradient sweep + arrow translate。
 */
const services = [
  {
    num: "01",
    name: "業務フロー診断（可視化）",
    desc:
      "現場の動きをヒアリング・観察し、業務の全体像と詰まっている箇所を可視化。まずは「何が起きているのか」を見える状態にするところから始めます。",
  },
  {
    num: "02",
    name: "AI活用設計",
    desc:
      "流行りでAIを入れません。事業のどこにAIが効くかを判定し、最適な活用ポイントを設計。人がやるべきこと／AIに任せることの線引きを定義します。",
  },
  {
    num: "03",
    name: "業務改善ダッシュボード（計測）",
    desc:
      "改善は計測できないと続きません。KPIを定義し、日々の業務とリンクするダッシュボードを構築。経営判断と現場実行を同じ数字でつなぎます。",
  },
  {
    num: "04",
    name: "DX設計ワークショップ",
    desc:
      "経営者・現場の両者に参加いただく形で、自社のDX全体像を一緒に描く場を提供。外注ではなく \"自分たちで動かせる\" 状態を作ります。",
  },
  {
    num: "05",
    name: "業務定着プログラム",
    desc:
      "「導入したのに使われない」を防ぐための運用支援。オンボーディング設計から、現場での習慣化まで、行動心理学を踏まえた定着まで伴走します。",
  },
  {
    num: "06",
    name: "顧客管理・営業支援アプリ（実装）",
    desc:
      "顧客情報の一元管理、見積作成の自動化、営業フローへのAI組込みなど。作って終わりではなく、現場で日々開かれるアプリを設計・開発します。",
  },
];

export function BehavioralServices() {
  return (
    <section
      id="services"
      className="edl-root bg-[var(--edl-off-white)] py-28 md:py-36 px-6 md:px-16"
    >
      <div className="max-w-[1240px] mx-auto">
        {/* Header */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-10 md:gap-20 items-end mb-16 md:mb-20">
          <div>
            <span className="edl-section-num edl-reveal mb-3">
              03 — Service
            </span>
            <h2
              className="edl-headline edl-reveal mt-3"
              data-delay="1"
              style={{ fontSize: "clamp(32px, 3.4vw, 48px)" }}
            >
              対応<span className="accent">領域</span>
              <span className="period">.</span>
            </h2>
          </div>
          <p
            className="edl-reveal text-[15px] text-[var(--edl-muted)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            診断・設計・実装・定着、それぞれの局面で必要な6つを揃えています。
            案件に応じて組み合わせ、過不足なくご提供します。
          </p>
        </div>

        {/* List */}
        <div
          className="edl-reveal border-t border-[var(--edl-line)]"
          data-delay="1"
        >
          {services.map((s) => (
            <a
              key={s.num}
              href="#contact"
              className="edl-service-row group grid grid-cols-[60px_1fr_auto] md:grid-cols-[80px_1.4fr_2fr_auto] gap-6 md:gap-10 py-9 items-start border-b border-[var(--edl-line)] transition-all duration-300 no-underline text-inherit"
            >
              <span className="font-[family-name:var(--font-en)] text-sm font-semibold tracking-[0.32em] text-[var(--edl-gold)] pt-2">
                {s.num}
              </span>
              <h3
                className="edl-jp-keep font-[family-name:var(--font-mincho)] font-semibold text-[var(--edl-navy)] tracking-[0.04em] leading-[1.5]"
                style={{ fontSize: "clamp(20px, 1.8vw, 26px)" }}
              >
                {s.name}
              </h3>
              <p
                className="hidden md:block text-[14.5px] text-[var(--edl-body)]"
                style={{ lineHeight: 2 }}
              >
                {s.desc}
              </p>
              <span className="font-[family-name:var(--font-en)] text-lg text-[var(--edl-muted)] transition-all duration-300 group-hover:translate-x-2 group-hover:text-[var(--edl-gold)] pt-2">
                →
              </span>
              {/* Mobile：説明を下に展開 */}
              <p
                className="md:hidden col-span-3 text-[14px] text-[var(--edl-body)] leading-[1.9]"
              >
                {s.desc}
              </p>
            </a>
          ))}
        </div>
      </div>

      {/* インライン: hover 時の gradient sweep を擬似要素で再現 */}
      <style jsx>{`
        .edl-service-row {
          position: relative;
        }
        .edl-service-row:hover {
          padding-left: 16px;
          padding-right: 16px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(184, 153, 104, 0.06),
            transparent
          );
        }
      `}</style>
    </section>
  );
}
