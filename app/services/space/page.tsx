"use client";

import { useState } from "react";

// ============================================
// データ定義
// ============================================

const painPoints = [
  "なんとなく空間が落ち着かない",
  "お客様の導線がうまく機能していない",
  "ブランドの世界観が空間に反映されていない",
  "滞在時間が思うように伸びない",
  "スタッフが動きにくいと感じている",
];

const values = [
  { label: "心地よさ", desc: "緊張しない、落ち着く、滞在したくなる空気感" },
  { label: "動線設計", desc: "人の動きを読み、自然な流れをつくる" },
  { label: "心理設計", desc: "無意識に働きかける色・光・素材の選定" },
  { label: "体験価値", desc: "訪れた人の記憶に残る空間体験" },
  { label: "ブランド表現", desc: "言葉にならない価値を空間で伝える" },
];

const services = [
  {
    title: "内装デザイン",
    desc: "素材・色・光のバランスで心地よさを設計",
  },
  {
    title: "店舗設計",
    desc: "ブランド体験と機能性を両立する空間構成",
  },
  {
    title: "ゾーニング・動線計画",
    desc: "人の流れと滞在を意識した配置設計",
  },
  {
    title: "レジン造作",
    desc: "空間体験を成立させるオリジナル造作物",
  },
  {
    title: "サイン・照明計画",
    desc: "視線誘導と雰囲気づくりの方向性提案",
  },
  {
    title: "設計監修",
    desc: "施工会社と連携し、設計意図を実現",
  },
];

const process = [
  { step: "01", title: "ヒアリング", desc: "想いや課題を丁寧にお聞きします" },
  { step: "02", title: "現状把握", desc: "空間の特性と可能性を見極めます" },
  { step: "03", title: "コンセプト設計", desc: "動線・体験・世界観を言語化" },
  { step: "04", title: "デザイン提案", desc: "具体的なプランをご提示します" },
  { step: "05", title: "設計・詳細化", desc: "素材・色・照明を詰めていきます" },
  { step: "06", title: "施工連携・完成", desc: "監修または連携で実現まで伴走" },
];

const cases = [
  {
    type: "美容サロン",
    purpose: "リピート率向上・滞在満足度の改善",
    approach: "待合から施術席への動線を再設計。照明と素材で「緊張→リラックス」の心理変化を演出",
    result: "平均滞在時間が延び、口コミでの「居心地」評価が向上",
  },
  {
    type: "カフェ・飲食店",
    purpose: "ブランドの世界観を空間で表現したい",
    approach: "入口から奥へ視線が抜ける配置に変更。レジンカウンターで唯一無二の印象を創出",
    result: "SNS投稿が増加、「雰囲気が良い」という来店動機が増えた",
  },
  {
    type: "ショールーム",
    purpose: "商品の価値が伝わる空間にしたい",
    approach: "商品を引き立てる背景と照明計画。回遊動線で滞在時間を自然に延長",
    result: "来場者の商品理解度が向上、商談率が改善",
  },
  {
    type: "オフィス・事務所",
    purpose: "採用力強化・社員の働きやすさ向上",
    approach: "エントランスで企業理念を空間表現。執務エリアは集中とコミュニケーションのゾーニング",
    result: "面接時の印象評価が向上、社員満足度も改善",
  },
];

const pricingFactors = [
  "対象面積・規模",
  "設計範囲（コンセプトのみ / 詳細設計まで）",
  "監修・施工連携の有無",
  "レジン造作の有無",
  "ご希望の納期",
];

const faqs = [
  {
    q: "設計のみの依頼は可能ですか？",
    a: "はい、設計・デザインのみのご依頼も承っております。施工は信頼できるパートナーをご紹介することも、お客様側の施工会社と連携することも可能です。",
  },
  {
    q: "施工まで一貫して依頼できますか？",
    a: "協力会社との連携により、設計から施工まで一貫してサポートいたします。設計意図を損なわない施工監修も行います。",
  },
  {
    q: "レジン造作だけの依頼は可能ですか？",
    a: "可能です。ただし、空間全体との調和を大切にしているため、設置環境についてヒアリングさせていただきます。",
  },
  {
    q: "どのくらいの期間がかかりますか？",
    a: "規模や内容により異なりますが、設計で1〜2ヶ月、施工を含む場合は2〜4ヶ月程度が目安です。詳しくはご相談ください。",
  },
  {
    q: "対応エリアはどこまでですか？",
    a: "全国対応可能です。オンラインでのお打ち合わせを中心に進め、必要に応じて現地訪問いたします。",
  },
  {
    q: "予算感を教えてください",
    a: "内容により幅がありますが、まずはご予算をお聞かせください。ご予算内で最大限の価値をご提案いたします。",
  },
  {
    q: "オンラインでの相談は可能ですか？",
    a: "はい、Zoom等でのオンライン相談を承っております。お気軽にお申し付けください。",
  },
];

// ============================================
// メインコンポーネント
// ============================================

export default function SpaceDesignPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleContact = () => {
    window.location.href = "/contact";
  };

  const handleScrollToProcess = () => {
    document.getElementById("process")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <style>{styles}</style>
      <div className="space-page">
        {/* ===== 1. Hero ===== */}
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-content">
            <h1 className="hero-title">
              そこにいる人の心地よさを
              <br />
              大切にした空間づくり。
            </h1>
            <p className="hero-subtitle">
              内装・店舗設計・レジン造作まで、
              <br className="sp-only" />
              人の感情や動きに寄り添い、
              <br />
              記憶に残る体験をデザインします。
            </p>
            <div className="hero-cta">
              <button className="btn btn-primary" onClick={handleContact}>
                無料相談する
              </button>
              <button className="btn btn-secondary" onClick={handleScrollToProcess}>
                相談の流れを見る
              </button>
            </div>
          </div>
        </section>

        {/* ===== 2. 共感セクション ===== */}
        <section className="section section-empathy">
          <div className="container">
            <h2 className="section-title">こんなお悩みはありませんか？</h2>
            <ul className="empathy-list">
              {painPoints.map((point, i) => (
                <li key={i} className="empathy-item">
                  <span className="empathy-dot" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== 3. 提供価値 ===== */}
        <section className="section section-values">
          <div className="container">
            <h2 className="section-title">私たちが大切にしていること</h2>
            <p className="section-lead">
              見た目の美しさだけでなく、その空間で過ごす人の
              <br className="pc-only" />
              「心地よさ」と「体験」を設計します。
            </p>
            <div className="values-grid">
              {values.map((v, i) => (
                <div key={i} className="value-card">
                  <h3 className="value-label">{v.label}</h3>
                  <p className="value-desc">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 4. サービス範囲 ===== */}
        <section className="section section-services">
          <div className="container">
            <h2 className="section-title">サービス内容</h2>
            <div className="services-grid">
              {services.map((s, i) => (
                <div key={i} className="service-card">
                  <h3 className="service-title">{s.title}</h3>
                  <p className="service-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 5. 進め方 ===== */}
        <section className="section section-process" id="process">
          <div className="container">
            <h2 className="section-title">ご相談から完成までの流れ</h2>
            <div className="process-grid">
              {process.map((p, i) => (
                <div key={i} className="process-card">
                  <span className="process-step">{p.step}</span>
                  <h3 className="process-title">{p.title}</h3>
                  <p className="process-desc">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 6. 事例 ===== */}
        <section className="section section-cases">
          <div className="container">
            <h2 className="section-title">空間づくりの事例</h2>
            <p className="section-lead">
              画像ではなく「何を考え、どう変わったか」でお伝えします。
            </p>
            <div className="cases-grid">
              {cases.map((c, i) => (
                <div key={i} className="case-card">
                  <span className="case-type">{c.type}</span>
                  <div className="case-section">
                    <span className="case-label">目的</span>
                    <p>{c.purpose}</p>
                  </div>
                  <div className="case-section">
                    <span className="case-label">工夫</span>
                    <p>{c.approach}</p>
                  </div>
                  <div className="case-section">
                    <span className="case-label">変化</span>
                    <p>{c.result}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 7. 料金の考え方 ===== */}
        <section className="section section-pricing">
          <div className="container">
            <h2 className="section-title">料金の考え方</h2>
            <p className="section-lead">
              プロジェクトごとに最適なプランをご提案いたします。
              <br />
              以下の要素により費用が変動します。
            </p>
            <ul className="pricing-factors">
              {pricingFactors.map((f, i) => (
                <li key={i} className="pricing-factor">
                  {f}
                </li>
              ))}
            </ul>
            <p className="pricing-note">
              まずはお気軽にご相談ください。
              <br />
              ご予算に応じた進め方をご提案いたします。
            </p>
            <button className="btn btn-primary" onClick={handleContact}>
              無料相談する
            </button>
          </div>
        </section>

        {/* ===== 8. FAQ ===== */}
        <section className="section section-faq">
          <div className="container">
            <h2 className="section-title">よくあるご質問</h2>
            <div className="faq-list">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className={`faq-item ${openFaq === i ? "open" : ""}`}
                >
                  <button
                    className="faq-question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    aria-expanded={openFaq === i}
                  >
                    <span className="faq-q">Q.</span>
                    <span className="faq-text">{faq.q}</span>
                    <span className="faq-toggle">{openFaq === i ? "−" : "+"}</span>
                  </button>
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 9. 最終CTA ===== */}
        <section className="section section-final-cta">
          <div className="container">
            <h2 className="final-cta-title">
              空間のことで、
              <br className="sp-only" />
              少しでも気になることがあれば
            </h2>
            <p className="final-cta-text">
              「まだ具体的に決まっていない」という段階でも大丈夫です。
              <br />
              お話を聞かせていただくだけでも、きっと何かのヒントになります。
            </p>
            <button className="btn btn-primary btn-large" onClick={handleContact}>
              無料で相談してみる
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

// ============================================
// CSS
// ============================================

const styles = `
/* ===== Base ===== */
.space-page {
  font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
  color: #1a1a1a;
  line-height: 1.8;
  background: #fafafa;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 24px;
}

.sp-only { display: none; }
.pc-only { display: inline; }

@media (max-width: 768px) {
  .sp-only { display: inline; }
  .pc-only { display: none; }
}

/* ===== Section Common ===== */
.section {
  padding: 100px 0;
  position: relative;
}

.section::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  max-width: 600px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.08), transparent);
}

.section:last-child::after {
  display: none;
}

.section-title {
  font-size: clamp(24px, 5vw, 32px);
  font-weight: 600;
  text-align: center;
  margin-bottom: 24px;
  letter-spacing: 0.02em;
  color: #1a1a1a;
}

.section-lead {
  text-align: center;
  color: #555;
  font-size: 15px;
  margin-bottom: 48px;
  line-height: 1.9;
}

/* ===== Buttons ===== */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 16px 32px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  letter-spacing: 0.02em;
}

.btn:focus {
  outline: 2px solid #1e40af;
  outline-offset: 2px;
}

.btn-primary {
  background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
  color: #fff;
  box-shadow: 0 2px 8px rgba(30, 64, 175, 0.2);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(30, 64, 175, 0.3);
}

.btn-secondary {
  background: transparent;
  color: #1e3a5f;
  border: 1px solid rgba(30, 58, 95, 0.3);
}

.btn-secondary:hover {
  background: rgba(30, 58, 95, 0.04);
  border-color: rgba(30, 58, 95, 0.5);
}

.btn-large {
  padding: 20px 48px;
  font-size: 16px;
}

/* ===== 1. Hero ===== */
.hero {
  position: relative;
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(30, 64, 175, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(100, 116, 139, 0.06) 0%, transparent 50%),
    linear-gradient(180deg, #f8f9fa 0%, #f0f2f5 100%);
  animation: heroGradient 20s ease infinite;
}

@keyframes heroGradient {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 0 24px;
  max-width: 800px;
}

.hero-title {
  font-size: clamp(28px, 6vw, 48px);
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 32px;
  letter-spacing: 0.02em;
  color: #1a1a1a;
}

.hero-subtitle {
  font-size: clamp(14px, 3vw, 17px);
  color: #555;
  line-height: 2;
  margin-bottom: 48px;
}

.hero-cta {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ===== 2. Empathy ===== */
.section-empathy {
  background: #fff;
}

.empathy-list {
  list-style: none;
  padding: 0;
  max-width: 500px;
  margin: 0 auto;
}

.empathy-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  font-size: 15px;
  color: #333;
  border-bottom: 1px solid rgba(0,0,0,0.04);
}

.empathy-item:last-child {
  border-bottom: none;
}

.empathy-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1e40af, #64748b);
  flex-shrink: 0;
}

/* ===== 3. Values ===== */
.section-values {
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.value-card {
  background: #fff;
  padding: 32px 28px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.04);
  transition: all 0.3s ease;
}

.value-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.04);
  border-color: rgba(30, 64, 175, 0.1);
}

.value-label {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #1e3a5f;
}

.value-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.7;
  margin: 0;
}

/* ===== 4. Services ===== */
.section-services {
  background: #fff;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.service-card {
  padding: 28px 24px;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 6px;
  background: linear-gradient(135deg, #fafafa 0%, #fff 100%);
  transition: all 0.3s ease;
}

.service-card:hover {
  border-color: rgba(30, 64, 175, 0.15);
  background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%);
}

.service-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.service-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* ===== 5. Process ===== */
.section-process {
  background: linear-gradient(180deg, #f5f5f5 0%, #fafafa 100%);
}

.process-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.process-card {
  text-align: center;
  padding: 32px 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.04);
  position: relative;
}

.process-step {
  display: block;
  font-size: 28px;
  font-weight: 300;
  color: rgba(30, 64, 175, 0.3);
  margin-bottom: 12px;
  letter-spacing: 0.05em;
}

.process-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.process-desc {
  font-size: 13px;
  color: #666;
  margin: 0;
  line-height: 1.6;
}

/* ===== 6. Cases ===== */
.section-cases {
  background: #fff;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.case-card {
  padding: 32px 28px;
  background: linear-gradient(145deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.04);
  transition: all 0.3s ease;
}

.case-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.04);
  border-color: rgba(30, 64, 175, 0.08);
}

.case-type {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
  background: rgba(30, 64, 175, 0.06);
  padding: 6px 14px;
  border-radius: 20px;
  margin-bottom: 20px;
  letter-spacing: 0.02em;
}

.case-section {
  margin-bottom: 16px;
}

.case-section:last-child {
  margin-bottom: 0;
}

.case-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #999;
  margin-bottom: 4px;
  letter-spacing: 0.05em;
}

.case-section p {
  font-size: 14px;
  color: #444;
  margin: 0;
  line-height: 1.7;
}

/* ===== 7. Pricing ===== */
.section-pricing {
  background: linear-gradient(180deg, #fafafa 0%, #f0f2f5 100%);
  text-align: center;
}

.pricing-factors {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
}

.pricing-factor {
  font-size: 14px;
  color: #555;
  padding: 10px 20px;
  background: #fff;
  border-radius: 24px;
  border: 1px solid rgba(0,0,0,0.06);
}

.pricing-note {
  font-size: 15px;
  color: #555;
  margin-bottom: 32px;
}

/* ===== 8. FAQ ===== */
.section-faq {
  background: #fff;
}

.faq-list {
  max-width: 700px;
  margin: 0 auto;
}

.faq-item {
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.faq-question {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 15px;
  color: #1a1a1a;
  transition: color 0.2s;
}

.faq-question:hover {
  color: #1e40af;
}

.faq-question:focus {
  outline: none;
}

.faq-question:focus-visible {
  outline: 2px solid #1e40af;
  outline-offset: 2px;
}

.faq-q {
  font-weight: 600;
  color: #1e40af;
  flex-shrink: 0;
}

.faq-text {
  flex: 1;
  font-weight: 500;
}

.faq-toggle {
  font-size: 20px;
  color: #999;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
}

.faq-answer {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, padding 0.3s ease;
}

.faq-item.open .faq-answer {
  max-height: 300px;
  padding-bottom: 24px;
}

.faq-answer p {
  font-size: 14px;
  color: #555;
  margin: 0;
  padding-left: 32px;
  line-height: 1.8;
}

/* ===== 9. Final CTA ===== */
.section-final-cta {
  background: linear-gradient(180deg, #1e3a5f 0%, #0f1f33 100%);
  text-align: center;
  padding: 120px 0;
}

.section-final-cta::after {
  display: none;
}

.final-cta-title {
  font-size: clamp(24px, 5vw, 32px);
  font-weight: 600;
  color: #fff;
  margin-bottom: 24px;
  line-height: 1.6;
}

.final-cta-text {
  font-size: 15px;
  color: rgba(255,255,255,0.8);
  margin-bottom: 40px;
  line-height: 1.9;
}

.section-final-cta .btn-primary {
  background: #fff;
  color: #1e3a5f;
}

.section-final-cta .btn-primary:hover {
  background: #f8f9fa;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .section {
    padding: 72px 0;
  }

  .hero {
    min-height: 80vh;
  }

  .hero-cta {
    flex-direction: column;
    align-items: center;
  }

  .hero-cta .btn {
    width: 100%;
    max-width: 280px;
  }

  .process-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .section-final-cta {
    padding: 80px 0;
  }
}

@media (max-width: 480px) {
  .process-grid {
    grid-template-columns: 1fr;
  }
}
`;
