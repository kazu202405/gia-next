"use client";

/**
 * FAQ — Editorial Q/A 一覧
 * 静的展開（折りたたみなし）。Q（金）/ A（muted）の明朝レター付き。
 */
const faqs = [
  {
    q: "業務の整理って、具体的に何をしてくれるんですか？",
    a:
      "まず「誰が・何を・どの順番で」やっているかを可視化します。そのうえで、人がやるべきこと・仕組みに任せるべきことを仕分けし、必要に応じてシステム化やAI活用の設計まで行います。",
  },
  {
    q: "相談したら必ず契約しないといけませんか？",
    a:
      "いいえ。無料相談は「現状の整理」が目的です。相談した結果、自社で対応できそうだと思えばそれで大丈夫です。押し売りは一切しません。",
  },
  {
    q: "行動心理学とAIアプリ制作、両方を提供している会社は珍しいのでは？",
    a:
      "はい、私たちの強みです。仕組みを作るだけでなく \"人がなぜ動くか\" を踏まえた設計ができるため、現場で実際に使われるシステムが生まれます。\"作ったが使われない\" を生まないことが、私たちのこだわりです。",
  },
  {
    q: "社員が少ないのですが、仕組み化できますか？",
    a:
      "業務内容にもよりますが、少人数の会社でも仕組み化できた事例は多くあります。実際に在宅スタッフだけで回る体制を構築したケースも。まずは現状を聞かせていただければ、可能かどうかを一緒に判断できます。",
  },
  {
    q: "制作期間はどれくらいですか？",
    a:
      "小さく作って早く検証することを基本にしています。要件によって変わりますが、多くの場合4〜8週間で初版をリリースし、その後現場運用と並行して育てていきます。",
  },
  {
    q: "既存のシステムとの連携はできますか？",
    a:
      "可能です。既存のCRM・基幹システム・スプレッドシート等との連携を前提に設計します。「ゼロから作り直し」ではなく、いまあるものを活かす方針を基本にしています。",
  },
  {
    q: "費用はどのくらいかかりますか？",
    a:
      "一般的なコンサルティングは月額30〜50万円が相場ですが、GIAは仕組み化支援に特化しているため月額5万円〜からご相談いただけます。過去に似たような事例があり、新たに対応すべきことが多くないケースでは、月額3万円程度からご対応させていただいた実績もあります。企業の状況や課題に応じて柔軟に対応しますので、まずはお気軽に無料相談でお聞かせください。",
  },
];

export function Faq() {
  return (
    <section
      id="faq"
      className="edl-root bg-white py-28 md:py-36 px-6 md:px-16"
    >
      <div className="max-w-[920px] mx-auto">
        <div className="mb-16">
          <span className="edl-section-num edl-reveal mb-3">07 — FAQ</span>
          <h2
            className="edl-headline edl-reveal mt-3"
            data-delay="1"
            style={{ fontSize: "clamp(32px, 3.4vw, 48px)" }}
          >
            よくある<span className="accent">ご質問</span>
            <span className="period">.</span>
          </h2>
        </div>

        <dl className="border-t border-[var(--edl-line)]">
          {faqs.map((faq, i) => (
            <div
              key={faq.q}
              className="edl-reveal grid grid-cols-1 gap-4 py-8 border-b border-[var(--edl-line)]"
              data-delay={String(Math.min(i + 1, 6))}
            >
              <dt
                className="edl-jp-keep relative pl-12 font-[family-name:var(--font-mincho)] font-semibold text-[var(--edl-navy)] tracking-[0.03em] leading-[1.6]"
                style={{ fontSize: "clamp(18px, 1.8vw, 22px)" }}
              >
                <span className="absolute -top-0.5 left-0 font-[family-name:var(--font-en)] text-[22px] font-semibold text-[var(--edl-gold)] tracking-[0.04em]">
                  Q
                </span>
                {faq.q}
              </dt>
              <dd
                className="relative pl-12 text-[15px] text-[var(--edl-body)]"
                style={{ lineHeight: 2 }}
              >
                <span className="absolute -top-0 left-0 font-[family-name:var(--font-en)] text-[18px] font-semibold text-[var(--edl-muted)] tracking-[0.04em]">
                  A
                </span>
                {faq.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
