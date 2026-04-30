import type { Metadata } from "next";
import Link from "next/link";
import { EdlRevealObserver } from "@/components/ui/edl-reveal";

export const metadata: Metadata = {
  title: "Executive AI Clone | 経営者の実務時間を1日2時間に圧縮するAI秘書 | GIA",
  description:
    "経営者専用のAIクローンが、全社のチャット・カレンダー・議事録を24時間モニタリング。朝の要点まとめから重要シグナル抽出まで、CEOの脳の延長として機能します。お使いのチャットツール（Slack / Teams / LINE WORKS / LINE等）にそのまま統合。",
  alternates: {
    canonical: "/services/ai",
  },
};

const pains = [
  {
    title: "会議の準備ができていない",
    body: "前提の確認だけで時間が終わり、本論にたどり着けない。担当者への資料依頼も自分でDMしている。",
  },
  {
    title: "現場のシグナルを見落としている",
    body: "全社のチャットや日報を追いきれない。重要顧客の失注リスクや優秀人材の不満が、起きてから耳に入る。",
  },
  {
    title: "マネージャーの優先順位が見えない",
    body: "「新規をやっている」と聞くが、実際の時間配分はわからない。事実ベースで把握する手段がない。",
  },
  {
    title: "レポートを要求すると現場が疲弊する",
    body: "細かい報告を求めれば反発を招く。把握のために現場の手を止めるのは本末転倒だが、他に方法がない。",
  },
];

const features = [
  {
    num: "01",
    eyebrow: "Morning Briefing",
    title: "朝の始業前に、準備の済んだ一日が届く",
    body: "AIが今日のスケジュールを読み、関連するGoogle Docsや過去議事録と自動で照合。情報が不足している会議を検知すると、担当者へAIから資料準備のDMが自動送信されます。経営者の準備時間は20分から0分へ。",
    highlights: [
      "カレンダー × 関連資料の自動照合",
      "情報不足の会議を自動検知",
      "担当者への資料依頼DMをAIが代行",
    ],
  },
  {
    num: "02",
    eyebrow: "Signal Extraction",
    title: "数万件のログから「重要シグナル」だけ",
    body: "全社のチャット・議事録・カレンダー・音声録音を24時間クローリング。経営コンテキスト（3カ年計画・重要KPI・CEO脳）と照らし合わせ、ノイズを弾いた上で重要な予兆だけをS/A/B/Cで通知します。",
    highlights: [
      "重要KPIに関わる予兆のみ抽出",
      "S/A/B/Cの4段階アラート",
      "シグナルは「仮説 / 学び / 意思決定 / 接触 / アイデア」に分類",
    ],
  },
  {
    num: "03",
    eyebrow: "Feedback Loop",
    title: "使うほど、あなたの脳に近づく",
    body: "シグナルへのCEOの判断を、スマホの標準アプリで1日15分インプット。録音と同時に文字起こしまで完結するので、新しいツールを覚える必要はありません。「経営コンテキスト」が日々更新され、AIの判断軸はあなたの思考プロセスに収束していきます。",
    highlights: [
      "スマホの標準アプリで録音 → 自動文字起こし",
      "経営判断の文脈をAIが学習",
      "全体精度の8割は、このループが担う",
    ],
  },
];

const numbers = [
  { label: "会議準備時間", before: "1日 平均40分", after: "0分" },
  { label: "会議の質（AI評価）", before: "60点", after: "80点以上" },
  { label: "現場のレポート作成", before: "月数百時間", after: "ゼロ" },
  { label: "戦略・採用・重要顧客対応", before: "—", after: "1日 +3時間" },
];

const flow = [
  {
    num: "01",
    title: "ヒアリング",
    body: "御社のKPI・3カ年計画・経営者の思考プロセスを抽出し、AIに与える「経営コンテキスト」を設計します。",
  },
  {
    num: "02",
    title: "AIセットアップ",
    body: "御社のチャットツール（Slack / Teams / LINE WORKS 等）・Google Workspace・Notionを連携。既存環境に上乗せする形で初期構築します。",
  },
  {
    num: "03",
    title: "1ヶ月の並走運用",
    body: "毎日のシグナル抽出と通知精度を、フィードバックループでチューニング。報告のヒット率を引き上げます。",
  },
  {
    num: "04",
    title: "自走フェーズへ",
    body: "コンテキストが固まり、AIが自律的に判断・通知できる状態へ。以降は月次でロジックを見直します。",
  },
];

export default function AICloneServicePage() {
  return (
    <div className="edl-root bg-[var(--edl-off-white)] text-[var(--edl-body)]">
      <EdlRevealObserver />

      {/* Hero */}
      <section className="relative pt-32 md:pt-44 pb-24 md:pb-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-16 md:gap-24 items-end">
          <div>
            <span className="edl-eyebrow edl-reveal mb-7">
              Executive AI Clone
            </span>
            <h1
              className="edl-headline edl-reveal mb-7"
              data-delay="1"
              style={{ fontSize: "clamp(38px, 4.6vw, 68px)" }}
            >
              毎日10時間かかる<br />
              経営業務を、<span className="accent">1時間</span>に<span className="period">.</span>
            </h1>
            <p
              className="edl-reveal max-w-[44ch] text-[15px] tracking-[0.02em] text-[var(--edl-body)]"
              data-delay="2"
              style={{ lineHeight: 2.05 }}
            >
              経営者専用の<strong className="edl-hl">AIクローン</strong>が、
              全社のチャット・議事録・カレンダーを24時間モニタリング。
              朝の要点まとめから重要シグナルの抽出まで、
              <strong className="edl-hl">CEOの脳の延長</strong>
              として機能します。普段使っているチャットツールにそのまま統合。
            </p>

            <div
              className="edl-reveal mt-10 flex flex-col items-start gap-5"
              data-delay="3"
            >
              <a
                href="https://page.line.me/131liqrt"
                target="_blank"
                rel="noopener noreferrer"
                className="edl-cta-primary line"
              >
                LINEで無料相談
                <span className="arrow" />
              </a>
              <a href="#how-it-works" className="edl-cta-secondary">
                仕組みを見る
              </a>
            </div>
          </div>

          {/* 右：エディトリアル数字パネル */}
          <div
            className="edl-reveal hidden md:block border-l border-[var(--edl-gold)] pl-10"
            data-delay="4"
          >
            <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.32em] text-[var(--edl-muted)] mb-6">
              FROM ─── TO
            </p>
            <dl className="space-y-7">
              <div>
                <dt className="font-[family-name:var(--font-mincho)] text-sm text-[var(--edl-muted)]">
                  実務時間
                </dt>
                <dd className="font-[family-name:var(--font-mincho)] text-3xl text-[var(--edl-navy)] tracking-tight mt-1">
                  10h <span className="text-[var(--edl-gold)] mx-2">→</span> 1h
                </dd>
              </div>
              <div>
                <dt className="font-[family-name:var(--font-mincho)] text-sm text-[var(--edl-muted)]">
                  会議準備
                </dt>
                <dd className="font-[family-name:var(--font-mincho)] text-3xl text-[var(--edl-navy)] tracking-tight mt-1">
                  40min <span className="text-[var(--edl-gold)] mx-2">→</span> 0
                </dd>
              </div>
              <div>
                <dt className="font-[family-name:var(--font-mincho)] text-sm text-[var(--edl-muted)]">
                  CEO本来業務
                </dt>
                <dd className="font-[family-name:var(--font-mincho)] text-3xl text-[var(--edl-navy)] tracking-tight mt-1">
                  +3h / day
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Pain */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">02 — Pain</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-16 max-w-[26ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            多忙を極める経営者の<br />
            <span className="accent">4つの構造的な問題</span>
            <span className="period">.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
            {pains.map((p, i) => (
              <div
                key={p.title}
                className="edl-reveal bg-[var(--edl-off-white)] p-8 md:p-10"
                data-delay={String((i % 2) + 1)}
              >
                <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold)] mb-4">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="font-[family-name:var(--font-mincho)] text-xl md:text-2xl text-[var(--edl-navy)] mb-4 tracking-[0.02em]">
                  {p.title}
                </h3>
                <p className="text-[14px] text-[var(--edl-body)] leading-[2]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-24 md:py-32 px-6 md:px-16 bg-[var(--edl-navy)] text-white border-b border-[var(--edl-line-dark)]"
      >
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num on-dark edl-reveal">
            03 — How it works
          </span>
          <h2
            className="edl-headline on-dark edl-reveal mt-4 mb-6 max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            使い方は、<span className="accent">普段のチャット</span>だけ
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal text-white/70 max-w-[56ch] mb-16 text-[15px]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            ダッシュボードも管理画面も覚える必要はありません。
            朝の要点まとめも、シグナルの通知も、戦略のアップデートも、
            すべて普段お使いのチャット（Slack / Teams / LINE WORKS / LINE 等）と音声入力で完結します。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
            <div className="bg-[var(--edl-navy)] p-8 md:p-10">
              <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-4">
                INPUT
              </p>
              <p className="font-[family-name:var(--font-mincho)] text-lg text-white mb-3">
                経営コンテキスト
              </p>
              <p className="text-[13px] text-white/65 leading-[1.9]">
                ミッション、3カ年計画、重要KPI、CEOの判断基準、会議の目的と評価。AIが「何を重要とみなすか」の事前知識。
              </p>
            </div>
            <div className="bg-[var(--edl-navy)] p-8 md:p-10">
              <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-4">
                STREAM
              </p>
              <p className="font-[family-name:var(--font-mincho)] text-lg text-white mb-3">
                全社の生データ
              </p>
              <p className="text-[13px] text-white/65 leading-[1.9]">
                全社チャット（Slack / Teams / LINE WORKS 等）、Google Docs、カレンダー、議事録、音声録音。1日数万件のコミュニケーションを自動取り込み。
              </p>
            </div>
            <div className="bg-[var(--edl-navy)] p-8 md:p-10">
              <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold-soft)] mb-4">
                OUTPUT
              </p>
              <p className="font-[family-name:var(--font-mincho)] text-lg text-white mb-3">
                チャットへの通知
              </p>
              <p className="text-[13px] text-white/65 leading-[1.9]">
                朝の要点まとめ / 重要シグナルのアラート / 担当者への自動DM。CEOの判断は音声でAIに返す。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">04 — Core</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-20 max-w-[24ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            3つの<span className="accent">コア機能</span>
            <span className="period">.</span>
          </h2>

          <div className="space-y-20 md:space-y-28">
            {features.map((f, i) => (
              <div
                key={f.num}
                className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-10 md:gap-16 items-start"
              >
                <div className="edl-reveal">
                  <p className="font-[family-name:var(--font-en)] text-[64px] md:text-[88px] leading-none text-[var(--edl-gold)] tracking-tight">
                    {f.num}
                  </p>
                </div>
                <div className="edl-reveal" data-delay="1">
                  <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-muted)] mb-3">
                    {f.eyebrow}
                  </p>
                  <h3
                    className="font-[family-name:var(--font-mincho)] text-[var(--edl-navy)] mb-6"
                    style={{
                      fontSize: "clamp(22px, 2.4vw, 32px)",
                      lineHeight: 1.4,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p className="max-w-[58ch] text-[15px] text-[var(--edl-body)] mb-8" style={{ lineHeight: 2 }}>
                    {f.body}
                  </p>
                  <ul className="border-t border-[var(--edl-line)]">
                    {f.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-4 py-4 border-b border-[var(--edl-line)]"
                      >
                        <span className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] mt-1.5">
                          ●
                        </span>
                        <span className="text-[14px] text-[var(--edl-body)] leading-[1.9]">
                          {h}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Optional: Manager view */}
          <div className="edl-reveal mt-24 md:mt-32 border border-[var(--edl-line)] p-8 md:p-12 bg-white/40">
            <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-muted)] mb-3">
              OPTIONAL — Manager View
            </p>
            <h3 className="font-[family-name:var(--font-mincho)] text-2xl text-[var(--edl-navy)] mb-4 tracking-[0.02em]">
              現場の「事実」と「認識」のギャップを可視化
            </h3>
            <p className="max-w-[60ch] text-[14px] text-[var(--edl-body)] leading-[2]">
              各メンバーのスケジュールとチャットログから、新規営業 / 既存営業 / 内部業務の比率を自動算出。
              「新規をやっているつもり」と「実際は5%」の乖離を、マネージャー自身がデータで把握できます。
            </p>
          </div>
        </div>
      </section>

      {/* Numbers（dark：Before→After のデータ表は暗背景に金矢印が映える） */}
      <section className="py-24 md:py-32 px-6 md:px-16 bg-[var(--edl-navy)] text-white border-b border-[var(--edl-line-dark)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num on-dark edl-reveal">05 — Effects</span>
          <h2
            className="edl-headline on-dark edl-reveal mt-4 mb-16 max-w-[26ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            導入後の<span className="accent">変化</span>
            <span className="period">.</span>
          </h2>

          <div className="border-t border-[var(--edl-gold-soft)]">
            {numbers.map((n, i) => (
              <div
                key={n.label}
                className="edl-reveal grid grid-cols-12 items-baseline py-7 md:py-9 border-b border-white/15"
                data-delay={String((i % 4) + 1)}
              >
                <div className="col-span-12 md:col-span-4 font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-white/65">
                  {String(i + 1).padStart(2, "0")} — {n.label}
                </div>
                <div className="col-span-6 md:col-span-4 mt-3 md:mt-0 font-[family-name:var(--font-mincho)] text-white/45 text-base md:text-lg line-through decoration-white/20">
                  {n.before}
                </div>
                <div className="col-span-6 md:col-span-4 mt-3 md:mt-0 font-[family-name:var(--font-mincho)] text-white text-2xl md:text-3xl tracking-tight">
                  <span className="text-[var(--edl-gold-soft)] mr-3">→</span>
                  {n.after}
                </div>
              </div>
            ))}
          </div>

          <p className="edl-reveal mt-10 text-[12px] text-white/55" data-delay="2">
            ※ 想定効果。実数値は1ヶ月の並走運用フェーズで御社環境にチューニングします。
          </p>
        </div>
      </section>

      {/* Flow */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">06 — Flow</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-16 max-w-[26ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            ツール提供ではなく、<br />
            <span className="accent">経営コンテキスト</span>の組み込みから<span className="period">.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
            {flow.map((s, i) => (
              <div
                key={s.num}
                className="edl-reveal bg-[var(--edl-off-white)] p-8 md:p-10"
                data-delay={String((i % 4) + 1)}
              >
                <p className="font-[family-name:var(--font-en)] text-[40px] leading-none text-[var(--edl-gold)] tracking-tight mb-6">
                  {s.num}
                </p>
                <h3 className="font-[family-name:var(--font-mincho)] text-lg text-[var(--edl-navy)] mb-3 tracking-[0.02em]">
                  {s.title}
                </h3>
                <p className="text-[13px] text-[var(--edl-body)] leading-[1.9]">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — 末尾なので edl-section-fade-deep でFooter(navy-deep)に向けて滲ませる */}
      <section className="py-24 md:py-36 px-6 md:px-16 edl-section-fade-deep text-white">
        <div className="max-w-[1240px] mx-auto text-center">
          <span className="edl-section-num on-dark edl-reveal is-centered">
            07 — Inquiry
          </span>
          <h2
            className="edl-headline on-dark edl-reveal mt-6 mb-8 mx-auto max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.4vw, 48px)" }}
          >
            社長にしかできない仕事に、<br />
            <span className="accent">時間を返す</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal mx-auto max-w-[48ch] text-white/70 text-[15px] mb-12"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            まずは御社のKPI・経営課題をヒアリングし、
            「AIクローンを置いた時、最初の1ヶ月でどこが変わるか」を診断します。
            導入数には限りがあります。
          </p>
          <div className="edl-reveal flex flex-col items-center gap-5" data-delay="3">
            <a
              href="https://page.line.me/131liqrt"
              target="_blank"
              rel="noopener noreferrer"
              className="edl-cta-primary on-dark line"
            >
              LINEで無料診断を申し込む
              <span className="arrow" />
            </a>
            <Link href="/" className="edl-cta-secondary on-dark">
              GIAについて見る
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
