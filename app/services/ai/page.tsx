import type { Metadata } from "next";
import Link from "next/link";
import { EdlRevealObserver } from "@/components/ui/edl-reveal";

export const metadata: Metadata = {
  title: "AI Clone | 経営判断のAI Cloneを、あなたの会社に置く | GIA",
  description:
    "あなたの判断軸を引き継いだ経営判断のAI Cloneが、全社のチャット・カレンダー・議事録から日々の動きを継続的にキャッチ。朝の要点まとめから重要シグナル抽出まで、CEOの脳の延長として稼働します。お使いのチャットツール（Slack / Teams / LINE WORKS / LINE等）にそのまま統合。GIA独自の紹介設計の方法論が中に組み込まれた、経営判断のためのAI。",
  alternates: {
    canonical: "/services/ai",
  },
};

const pains = [
  {
    title: "会議の準備に、追われ続けている",
    body: "本論に入る前の前提確認で時間が溶ける。担当者への資料依頼も結局自分でDMする日が多く、1日の大半が会議と会議の準備で埋まっていく。",
  },
  {
    title: "現場のシグナルが、拾い切れない",
    body: "全社のチャットや日報の流量は、もう目で追える限界を超えている。重要顧客の失注リスクや優秀人材の不満が、起きてから耳に入ってくる。",
  },
  {
    title: "紹介は来るが、再現性がない",
    body: "いい紹介はたまに来る。けれど、なぜ来たのかを再現できない。商談の中で紹介の種を拾えているのか自分でも分からないまま、毎回「お願い」で終わっていく。",
  },
  {
    title: "判断軸が、組織に行き渡らない",
    body: "「これは社長ならどう判断するか」。社員が毎回確認しないと動けない構造になっている。社長本人も、自分の判断軸を整理しきれていないので、その都度ブレが生まれていく。",
  },
];

const features = [
  {
    num: "01",
    eyebrow: "Morning Briefing",
    title: "準備の済んだ一日を、朝に届ける",
    body: "今日のスケジュールを読み、関連する社内ドキュメントや過去議事録と自動で照合。情報が不足している会議を検知すると、担当者へ資料準備のDMが自動送信されます。経営者の準備時間は20分から0分へ。",
    highlights: [
      "カレンダー × 関連資料の自動照合",
      "情報不足の会議を自動検知",
      "担当者への資料依頼DMを自動代行",
    ],
  },
  {
    num: "02",
    eyebrow: "Signal Extraction",
    title: "数万件から、「重要シグナル」だけ拾う",
    body: "全社のチャット・議事録・カレンダー・音声録音から日々のシグナルを取りこぼさず拾い、あなたの経営コンテキスト（3カ年計画・重要KPI・CEO脳）と照らし合わせ、ノイズを弾いた上で重要な予兆だけをS/A/B/Cで通知します。",
    highlights: [
      "重要KPIに関わる予兆のみ抽出",
      "S/A/B/Cの4段階アラート",
      "シグナルは「仮説 / 学び / 意思決定 / 接触 / アイデア」に分類",
    ],
  },
  {
    num: "03",
    eyebrow: "Feedback Loop",
    title: "使うほど、あなたの判断軸に近づく",
    body: "シグナルへのCEOの判断を、スマホの標準アプリで1日15分インプット。録音と同時に文字起こしまで完結するので、新しいツールを覚える必要はありません。経営コンテキストが日々更新され、AIの判断軸はあなたの思考プロセスに収束していきます。",
    highlights: [
      "スマホの標準アプリで録音 → 自動文字起こし",
      "経営判断の文脈をAIが学習",
      "全体精度の8割は、このループが担う",
    ],
  },
];

const numbers = [
  { label: "会議準備時間", before: "1日 平均40分", after: "数分" },
  { label: "会議の準備密度", before: "議題のみ", after: "資料・議事録・背景まで揃う" },
  { label: "現場のレポート作成", before: "月数百時間", after: "大幅削減" },
];

const giaEdges = [
  {
    num: "01",
    eyebrow: "Referral Design",
    title: "紹介設計の方法論",
    body: "GIA紹介獲得セミナーで構築した、ギャップ理論／5つの障壁／見せ方と価値の2段設計。商談前メモやシグナル抽出に「紹介の種を拾う」観点が組み込まれます。",
  },
  {
    num: "02",
    eyebrow: "De-personalization",
    title: "属人化解消の枠組み",
    body: "仕組み化・行動分解・ボトルネック特定。日々の判断が「再現できる形」になっているかを検知し、属人化のリスクを通知します。",
  },
  {
    num: "03",
    eyebrow: "Decision Pattern",
    title: "経営者の判断パターン保持",
    body: "数字より直感／関係性優先／速度優先 等、経営者ごとの「哲学」を保持。過去の判断との矛盾も検知して指摘します。",
  },
];

const plans = [
  {
    name: "アシスタント",
    price: "¥4,980",
    note: "自分専用の紹介準備AI",
  },
  {
    name: "パートナー",
    price: "¥7,980",
    note: "通知強化・商談前リマインド",
  },
  {
    name: "チーム",
    price: "¥29,800〜",
    note: "判断軸をAI化（本ページ詳細）",
    flagship: true,
  },
  {
    name: "カスタマイズ",
    price: "¥150,000〜",
    note: "仕組み化・伴走支援",
  },
];

const flow = [
  {
    num: "01",
    title: "判断軸の抽出",
    body: "あなたの会社のKPI・3カ年計画・経営者の思考プロセスを抽出し、AIに与える「経営コンテキスト」として設計します。",
  },
  {
    num: "02",
    title: "AI Cloneの組み込み",
    body: "お使いのチャットツール（Slack / Teams / LINE WORKS 等）と社内ドキュメント、カレンダーにAI Cloneを組み込み。既存環境に上乗せする形で初期構築します。",
  },
  {
    num: "03",
    title: "AI Cloneのチューニング",
    body: "毎日のシグナル抽出と通知精度を、フィードバックループで学習させます。報告のヒット率を引き上げる1ヶ月の並走期間です。",
  },
  {
    num: "04",
    title: "AI Cloneの自走",
    body: "判断軸が固まり、自律的に判断・通知できる状態へ。以降は月次でロジックを見直します。",
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
              AI Clone
            </span>
            <h1
              className="edl-headline edl-reveal mb-7"
              data-delay="1"
              style={{ fontSize: "clamp(38px, 4.6vw, 68px)" }}
            >
              経営判断の<span className="accent">AI Clone</span>を、<br />
              あなたの会社に<br />
              置く<span className="period">.</span>
            </h1>
            <p
              className="edl-reveal max-w-[44ch] text-[15px] tracking-[0.02em] text-[var(--edl-body)]"
              data-delay="2"
              style={{ lineHeight: 2.05 }}
            >
              あなたの判断軸を引き継いだ<strong className="edl-hl">経営判断のAI Clone</strong>が、
              全社のチャット・議事録・カレンダーから日々の動きを継続的にキャッチ。
              朝の要点まとめから重要シグナルの抽出まで、
              <strong className="edl-hl">CEOの脳の延長</strong>
              として稼働します。1日の大半を占める実務時間を、3時間程度まで削減することを目指します。
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
                LINEで無料診断
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
                  10h <span className="text-[var(--edl-gold)] mx-2">→</span> 3h
                </dd>
              </div>
              <div>
                <dt className="font-[family-name:var(--font-mincho)] text-sm text-[var(--edl-muted)]">
                  会議準備
                </dt>
                <dd className="font-[family-name:var(--font-mincho)] text-3xl text-[var(--edl-navy)] tracking-tight mt-1">
                  40min <span className="text-[var(--edl-gold)] mx-2">→</span> 5min
                </dd>
              </div>
              <div>
                <dt className="font-[family-name:var(--font-mincho)] text-sm text-[var(--edl-muted)]">
                  CEO本来業務
                </dt>
                <dd className="font-[family-name:var(--font-mincho)] text-3xl text-[var(--edl-navy)] tracking-tight mt-1">
                  +1〜2h / day
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
            経営者に起きている<br />
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
            AI Cloneは、<span className="accent">普段のチャット</span>に住む
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal text-white/70 max-w-[56ch] mb-16 text-[15px]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            ダッシュボードも管理画面も覚える必要はありません。
            朝の要点まとめも、シグナルの通知も、判断軸のアップデートも、
            すべて普段お使いのチャット（Slack / Teams / LINE WORKS / LINE 等）と音声入力でAIとやり取りします。
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
                ミッション、3カ年計画、重要KPI、CEOの判断基準、会議の目的と評価。AIが「何を重要とみなすか」の判断軸。
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
                全社チャット（Slack / Teams / LINE WORKS 等）、社内ドキュメント、カレンダー、議事録、音声録音。社内のデータを自動で取り込みます。
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
            AI Cloneが<span className="accent">担う、3つの仕事</span>
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
              現場の動きを、事実ベースで可視化する
            </h3>
            <p className="max-w-[60ch] text-[14px] text-[var(--edl-body)] leading-[2]">
              各メンバーのスケジュールとチャットログから、新規営業 / 既存営業 / 内部業務の比率を自動算出。
              管理職本人にも見えづらかった時間配分を、誰も責めずに事実として共有できる状態にします。
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
            AI Cloneを置いた後の<span className="accent">変化</span>
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
            ※ Beta期の目標値。実数値は1ヶ月の並走運用フェーズで現場の文脈にチューニングし、1〜3ヶ月で段階的に到達を目指します。
          </p>
        </div>
      </section>

      {/* Interface — dashboard & Slack mock */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">06 — Interface</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            経営の動きを、<br />
            <span className="accent">静かに可視化する</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[60ch] mb-16 text-[15px] text-[var(--edl-body)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            毎日のSlack DMが入口。蓄積されたシグナルとKPIは、
            落ち着いたトーンのダッシュボードで一望できます。
            派手なチャートではなく、判断のための密度。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-6 md:gap-8 items-start">
            {/* Slack DM Mock */}
            <div className="edl-reveal" data-delay="1">
              <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-muted)] mb-3">
                01 — SLACK DM
              </p>
              <div className="bg-white border border-[var(--edl-line)] p-5 md:p-6 font-[family-name:var(--font-en)] text-[12px] leading-[1.85]">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[var(--edl-line)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--edl-gold)]" />
                  <span className="text-[10px] tracking-[0.25em] text-[var(--edl-gold)] font-semibold">
                    EXEC AI CLONE
                  </span>
                  <span className="ml-auto text-[10px] text-[var(--edl-muted)]">
                    21:00
                  </span>
                </div>
                <p className="font-[family-name:var(--font-mincho)] text-[14px] text-[var(--edl-navy)] mb-3">
                  🌙 今日の振り返りと明日の予習
                </p>
                <p className="text-[var(--edl-body)] mb-3">
                  <span className="text-[var(--edl-gold)] font-semibold">
                    🎯 KPI
                  </span>
                  <br />
                  月収300万到達 / 現状48万 (16%)
                </p>
                <p className="text-[var(--edl-body)] mb-3">
                  <span className="text-[var(--edl-navy)] font-semibold">
                    📅 今日
                  </span>
                  <br />
                  ・10:30 田中ABC 営業面談
                  <br />
                  ・14:00 GIA戦略会議
                </p>
                <p className="text-[var(--edl-body)] mb-1">
                  <span className="text-[var(--edl-navy)] font-semibold">
                    🌅 明日 11:00
                  </span>
                  <br />
                  山口さん面談
                  <br />
                  <span className="text-[var(--edl-muted)] text-[11px]">
                    └ 前回 4/12：紹介依頼の件
                  </span>
                </p>
                <p className="text-[var(--edl-body)] mt-3 pl-3 border-l-2 border-[var(--edl-gold)]">
                  💡 候補リストの感触を最初に確認。深追いせず、関係性軸で次の接点を残す。
                </p>
              </div>
            </div>

            {/* Dashboard Mock */}
            <div className="edl-reveal" data-delay="2">
              <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-muted)] mb-3">
                02 — DASHBOARD
              </p>
              <div className="bg-white border border-[var(--edl-line)] p-5 md:p-7">
                {/* Header strip */}
                <div className="flex items-baseline justify-between border-b border-[var(--edl-line)] pb-3 mb-4">
                  <p className="font-[family-name:var(--font-en)] text-[10px] tracking-[0.3em] text-[var(--edl-gold)] font-semibold">
                    GIA / EXECUTIVE AI CLONE
                  </p>
                  <p className="font-[family-name:var(--font-en)] text-[10px] text-[var(--edl-muted)]">
                    2026.05.02
                  </p>
                </div>

                {/* Brand line */}
                <p className="font-[family-name:var(--font-mincho)] text-[18px] md:text-[22px] text-[var(--edl-navy)] mb-1 tracking-[0.02em]">
                  CEO専用 経営知能システム
                </p>
                <p className="text-[11px] text-[var(--edl-muted)] mb-5">
                  Slack・Calendar・社内ドキュメントから経営シグナルを自動抽出
                </p>

                {/* 4 KPI mini cards */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {[
                    { label: "サロン提案", val: "8", target: "/24", pct: 33 },
                    { label: "サロン参加", val: "3", target: "/12", pct: 25 },
                    { label: "アプリ商談", val: "2", target: "/6", pct: 33 },
                    { label: "アプリ受注", val: "1", target: "/3", pct: 33 },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="border border-[var(--edl-line)] p-2.5"
                    >
                      <p className="text-[8px] tracking-[0.15em] text-[var(--edl-muted)] uppercase mb-1.5">
                        {s.label}
                      </p>
                      <p className="font-[family-name:var(--font-mincho)] text-[20px] text-[var(--edl-navy)] leading-none mb-1">
                        {s.val}
                        <span className="text-[10px] text-[var(--edl-muted)] ml-0.5">
                          {s.target}
                        </span>
                      </p>
                      <div className="relative h-1 bg-[var(--edl-line)] mt-1.5">
                        <div
                          className="absolute inset-y-0 left-0 bg-[var(--edl-gold)]"
                          style={{ width: `${s.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Revenue progress (Navy block) */}
                <div className="bg-[var(--edl-navy)] text-white p-3.5 mb-5">
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="font-[family-name:var(--font-en)] text-[9px] tracking-[0.3em] text-[var(--edl-gold-soft)] font-semibold">
                      MONTHLY REVENUE
                    </p>
                    <p className="font-[family-name:var(--font-mincho)] text-[10px] text-white/70">
                      ¥48万 / 目標 ¥300万
                    </p>
                  </div>
                  <div className="relative h-1 bg-white/15">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-white to-[var(--edl-gold-soft)]"
                      style={{ width: "16%" }}
                    />
                  </div>
                  <p className="font-[family-name:var(--font-mincho)] text-right text-[var(--edl-gold-soft)] text-[11px] mt-1.5">
                    16%
                  </p>
                </div>

                {/* Two columns: today + decisions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-[var(--edl-gold)] font-semibold mb-2 uppercase">
                      CEOの今日
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-[var(--edl-body)]">
                      <li className="flex gap-2">
                        <span className="text-[var(--edl-gold)] font-mono tabular-nums">
                          10:30
                        </span>
                        <span>田中ABC 営業面談</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[var(--edl-gold)] font-mono tabular-nums">
                          14:00
                        </span>
                        <span>GIA戦略会議</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-[var(--edl-gold)] font-mono tabular-nums">
                          16:00
                        </span>
                        <span>ウェルテック取締役会</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-[var(--edl-gold)] font-semibold mb-2 uppercase">
                      直近の意思決定
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-[var(--edl-body)]">
                      <li className="flex gap-2 items-baseline">
                        <span className="text-[9px] tracking-[0.15em] text-[var(--edl-gold)]">
                          決定
                        </span>
                        <span>紹介プログラム実装</span>
                      </li>
                      <li className="flex gap-2 items-baseline">
                        <span className="text-[9px] tracking-[0.15em] text-[var(--edl-gold)]">
                          決定
                        </span>
                        <span>5/26セミナー導線</span>
                      </li>
                      <li className="flex gap-2 items-baseline">
                        <span className="text-[9px] tracking-[0.15em] text-[var(--edl-muted)]">
                          ACTION
                        </span>
                        <span>network_app 優先</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="edl-reveal mt-6 text-[11px] text-[var(--edl-muted)]" data-delay="3">
            ※ 画面イメージ。実際のデータはあなたの経営コンテキスト・社内ドキュメント・Calendarに連動して動的に表示されます。
          </p>
        </div>
      </section>

      {/* Why GIA — methodology + small plan list */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">07 — Why GIA</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-6 max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            GIAだから提供できる<br />
            <span className="accent">AI Clone</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal max-w-[60ch] mb-16 text-[15px] text-[var(--edl-body)]"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            汎用AIアシスタントとの違いは、<strong className="edl-hl">AI Cloneに組み込む方法論</strong>。
            GIAが案件と紹介獲得セミナーで蓄積してきた紹介設計・属人化解消の枠組みを、
            シグナル抽出と通知判断に活かします。
          </p>

          {/* Methodology cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
            {giaEdges.map((m, i) => (
              <div
                key={m.num}
                className="edl-reveal bg-[var(--edl-off-white)] p-8 md:p-10"
                data-delay={String((i % 3) + 1)}
              >
                <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.3em] text-[var(--edl-gold)] mb-3">
                  {m.num} — {m.eyebrow}
                </p>
                <h3 className="font-[family-name:var(--font-mincho)] text-xl text-[var(--edl-navy)] mb-4 tracking-[0.02em]">
                  {m.title}
                </h3>
                <p className="text-[13px] text-[var(--edl-body)] leading-[1.95]">
                  {m.body}
                </p>
              </div>
            ))}
          </div>

          {/* Plans (small, footer-style listing) */}
          <div className="edl-reveal mt-20 md:mt-24" data-delay="1">
            <div className="flex items-baseline justify-between border-b border-[var(--edl-line)] pb-3 mb-6">
              <p className="font-[family-name:var(--font-en)] text-[11px] tracking-[0.32em] text-[var(--edl-muted)]">
                USE CASES & PLANS
              </p>
              <p className="text-[11px] text-[var(--edl-muted)]">
                ※ 本ページは「チーム」プランの詳細
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--edl-line)] border border-[var(--edl-line)]">
              {plans.map((p) => (
                <div
                  key={p.name}
                  className={`p-5 md:p-6 ${
                    p.flagship
                      ? "bg-[var(--edl-navy)] text-white"
                      : "bg-[var(--edl-off-white)]"
                  }`}
                >
                  <p
                    className={`font-[family-name:var(--font-mincho)] text-[14px] mb-2 tracking-[0.02em] ${
                      p.flagship ? "text-white" : "text-[var(--edl-navy)]"
                    }`}
                  >
                    {p.name}
                  </p>
                  <p
                    className={`font-[family-name:var(--font-mincho)] text-2xl tracking-tight mb-2 ${
                      p.flagship
                        ? "text-[var(--edl-gold-soft)]"
                        : "text-[var(--edl-navy)]"
                    }`}
                  >
                    {p.price}
                    <span className="text-[10px] tracking-wider ml-1 opacity-70">
                      /月
                    </span>
                  </p>
                  <p
                    className={`text-[11px] leading-[1.7] ${
                      p.flagship ? "text-white/70" : "text-[var(--edl-muted)]"
                    }`}
                  >
                    {p.note}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-[var(--edl-muted)] leading-[1.85]">
              ※ 月額は税別 / 初期設定はセルフ無料・代行 ¥27,000〜（プラン別）/ 会社カスタマイズは6ヶ月契約・基本3名まで・追加1名 月 ¥15,000。詳細はお問い合わせください。
            </p>
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="py-24 md:py-32 px-6 md:px-16 border-b border-[var(--edl-line)]">
        <div className="max-w-[1240px] mx-auto">
          <span className="edl-section-num edl-reveal">08 — Flow</span>
          <h2
            className="edl-headline edl-reveal mt-4 mb-16 max-w-[26ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.2vw, 44px)" }}
          >
            ツール提供ではなく、<br />
            <span className="accent">AI Cloneの育成</span>から<span className="period">.</span>
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
            09 — Inquiry
          </span>
          <h2
            className="edl-headline on-dark edl-reveal mt-6 mb-8 mx-auto max-w-[28ch]"
            data-delay="1"
            style={{ fontSize: "clamp(28px, 3.4vw, 48px)" }}
          >
            社長の時間を、<br />
            <span className="accent">増やす</span>
            <span className="period">.</span>
          </h2>
          <p
            className="edl-reveal mx-auto max-w-[48ch] text-white/70 text-[15px] mb-12"
            data-delay="2"
            style={{ lineHeight: 2 }}
          >
            まずはあなたの会社のKPI・経営課題をヒアリングし、
            「経営判断のAI Cloneを置いた時、最初の1ヶ月でどこが変わるか」を診断します。
            Beta期は丁寧な並走運用のため、月1〜2社に限らせていただいています。
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
