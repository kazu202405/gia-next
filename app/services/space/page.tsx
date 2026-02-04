"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// GSAP プラグイン登録
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================
// データ定義
// ============================================

const values = [
  {
    title: "心理設計",
    desc: "緊張しない、落ち着く、滞在したくなる。人の無意識に働きかける空間心理を設計します。",
    icon: "心",
  },
  {
    title: "動線設計",
    desc: "人の自然な動きを読み、ストレスのない流れをつくります。迷わない、疲れない空間を実現します。",
    icon: "流",
  },
  {
    title: "体験価値",
    desc: "訪れた人の記憶に残る、唯一無二の空間体験を創出します。また来たいと思える場所をつくります。",
    icon: "憶",
  },
];

const services = [
  { title: "内装デザイン", desc: "素材・色・光のバランスで心地よさを設計。和と洋、伝統と現代を融合させた空間表現を得意としています。" },
  { title: "店舗設計", desc: "ブランド体験と機能性を両立する空間構成。お客様の滞在体験を最大化する設計を行います。" },
  { title: "ゾーニング", desc: "人の流れと滞在を意識した配置設計。視線の抜けと溜まりを計算し、心地よい空間を創出します。" },
  { title: "レジン造作", desc: "空間体験を成立させるオリジナル造作物。唯一無二のカウンターやテーブルを制作。素材に想いを閉じ込めます。" },
  { title: "照明計画", desc: "視線誘導と雰囲気づくりの方向性を提案。光の陰影で空間に奥行きと表情を与えます。" },
  { title: "設計監修", desc: "施工会社と連携し、設計意図を忠実に実現。完成まで責任を持って伴走いたします。" },
];

const process = [
  { num: "01", title: "ヒアリング", desc: "想いや課題を丁寧にお聞きします" },
  { num: "02", title: "現状把握", desc: "空間の特性と可能性を見極めます" },
  { num: "03", title: "コンセプト", desc: "動線・体験・世界観を言語化します" },
  { num: "04", title: "デザイン提案", desc: "具体的なプランをご提示します" },
  { num: "05", title: "設計・詳細化", desc: "素材・色・照明を詰めていきます" },
  { num: "06", title: "施工・完成", desc: "監修または連携で実現まで伴走" },
];

const cases = [
  {
    type: "美容サロン",
    location: "東京都渋谷区",
    size: "約35坪",
    purpose: "リピート率向上・滞在満足度の改善",
    approach: "待合から施術席への動線を再設計。間接照明と天然素材で心理変化を演出。和紙調の仕切りで柔らかな空間分割を実現。",
    result: "平均滞在時間1.3倍、口コミでの「居心地」評価が大幅向上",
  },
  {
    type: "カフェ",
    location: "神奈川県鎌倉市",
    size: "約20坪",
    purpose: "ブランドの世界観を空間で表現",
    approach: "入口から奥へ視線が抜ける配置。レジンカウンターに流木を封入し、海辺の記憶を空間に。土壁風仕上げで温かみを演出。",
    result: "SNS投稿数3倍増、「雰囲気」を理由とした来店動機が60%に",
  },
  {
    type: "ショールーム",
    location: "大阪府大阪市",
    size: "約80坪",
    purpose: "商品の価値が伝わる空間に",
    approach: "商品を引き立てる墨色の背景と計算された照明計画。回遊動線で滞在時間を自然に延長。畳スペースで商談の質を向上。",
    result: "平均滞在時間2倍、商談成約率が25%向上",
  },
];

const faqs = [
  {
    q: "設計のみの依頼は可能ですか？",
    a: "はい、設計・デザインのみのご依頼も承っております。施工は信頼できるパートナー会社をご紹介することも、お客様側の施工会社と連携することも可能です。",
  },
  {
    q: "施工まで一貫して依頼できますか？",
    a: "協力会社との連携により、設計から施工まで一貫してサポートいたします。設計意図を損なわない施工監修も責任を持って行います。",
  },
  {
    q: "レジン造作だけの依頼は可能ですか？",
    a: "可能です。ただし、空間全体との調和を大切にしているため、設置環境についてヒアリングさせていただき、最適なご提案をいたします。",
  },
  {
    q: "どのくらいの期間がかかりますか？",
    a: "規模や内容により異なりますが、設計で1〜2ヶ月、施工を含む場合は2〜4ヶ月程度が目安です。お急ぎの場合もご相談ください。",
  },
  {
    q: "対応エリアはどこまでですか？",
    a: "全国対応可能です。オンラインでのお打ち合わせを中心に進め、必要に応じて現地訪問いたします。遠方の場合は交通費を別途頂戴しております。",
  },
];

// ============================================
// メインコンポーネント
// ============================================

export default function SpaceDesignPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // マウス追従（デスクトップのみ）
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // GSAP アニメーション
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero タイトルのフェードイン（fromToで明示的に状態指定）
      gsap.fromTo(".hero-title-line",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.1, force3D: true }
      );

      gsap.fromTo(".hero-subtitle",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out", delay: 0.4, force3D: true }
      );

      gsap.fromTo(".hero-cta",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", delay: 0.6, force3D: true }
      );

      // 背景シェイプのアニメーション
      gsap.to(".floating-shape-1", {
        y: -30,
        x: 20,
        rotation: 15,
        duration: 8,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".floating-shape-2", {
        y: 25,
        x: -15,
        rotation: -10,
        duration: 10,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.to(".floating-shape-3", {
        y: -20,
        x: -25,
        rotation: 8,
        duration: 12,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      // 円形の脈動
      gsap.to(".pulse-circle", {
        scale: 1.1,
        opacity: 0.3,
        duration: 4,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: 1.5,
      });

      // セクションごとのスクロールトリガー
      gsap.utils.toArray<HTMLElement>(".fade-section").forEach((section) => {
        gsap.fromTo(section,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power2.out",
            force3D: true,
            scrollTrigger: {
              trigger: section,
              start: "top 90%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      // カードのスタガーアニメーション
      gsap.utils.toArray<HTMLElement>(".stagger-cards").forEach((container) => {
        const cards = container.querySelectorAll(".card-item");
        gsap.fromTo(cards,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            stagger: 0.08,
            ease: "power2.out",
            force3D: true,
            scrollTrigger: {
              trigger: container,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }
        );
      });

      // プロセスラインアニメーション
      gsap.fromTo(".process-line",
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 0.8,
          ease: "power2.out",
          force3D: true,
          scrollTrigger: {
            trigger: ".process-line",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );

      // 漢字アイコンのアニメーション（回転を削除してシンプルに）
      gsap.utils.toArray<HTMLElement>(".kanji-icon").forEach((icon) => {
        gsap.fromTo(icon,
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
            force3D: true,
            scrollTrigger: {
              trigger: icon,
              start: "top 90%",
              toggleActions: "play none none none",
            },
          }
        );
      });
    }, containerRef);

    // ScrollTriggerをリフレッシュ
    ScrollTrigger.refresh(true);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const handleContact = () => {
    window.location.href = "/contact";
  };

  return (
    <div ref={containerRef} className="relative bg-[#f7f6f3] text-[#2a2a28] overflow-hidden">
      {/* ===== SVG フィルター定義 ===== */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <filter id="blur-lg">
            <feGaussianBlur stdDeviation="60" />
          </filter>
        </defs>
      </svg>

      {/* ===== 1. Hero ===== */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 背景レイヤー */}
        <div className="absolute inset-0">
          {/* ベースグラデーション */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#f7f6f3] via-[#f0ede8] to-[#e8e4dd]" />

          {/* 和紙風テクスチャ */}
          <div
            className="absolute inset-0 opacity-[0.04] mix-blend-multiply"
            style={{ filter: "url(#noise)" }}
          />

          {/* 浮遊するジオメトリックシェイプ */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
            {/* 大きな円 - 墨色 */}
            <circle
              className="floating-shape-1"
              cx={300 + (mousePos.x - 0.5) * 50}
              cy={250 + (mousePos.y - 0.5) * 50}
              r="180"
              fill="none"
              stroke="#3d3d3b"
              strokeWidth="0.5"
              opacity="0.15"
            />
            {/* 四角形 - 藍色 */}
            <rect
              className="floating-shape-2"
              x={650 - (mousePos.x - 0.5) * 30}
              y={350 - (mousePos.y - 0.5) * 30}
              width="120"
              height="120"
              fill="none"
              stroke="#1e3a5f"
              strokeWidth="0.5"
              opacity="0.12"
              transform="rotate(15 710 410)"
            />
            {/* 三角形 - 朱色 */}
            <polygon
              className="floating-shape-3"
              points="200,700 280,580 360,700"
              fill="none"
              stroke="#a0522d"
              strokeWidth="0.5"
              opacity="0.1"
            />
            {/* 小さな円たち */}
            <circle className="pulse-circle" cx="800" cy="200" r="40" fill="#3d3d3b" opacity="0.03" />
            <circle className="pulse-circle" cx="150" cy="500" r="60" fill="#1e3a5f" opacity="0.03" />
            <circle className="pulse-circle" cx="700" cy="750" r="35" fill="#a0522d" opacity="0.02" />
          </svg>

          {/* 横線装飾 */}
          <div className="absolute top-1/4 left-0 w-1/3 h-px bg-gradient-to-r from-transparent via-[#3d3d3b]/10 to-transparent" />
          <div className="absolute bottom-1/3 right-0 w-1/4 h-px bg-gradient-to-l from-transparent via-[#3d3d3b]/10 to-transparent" />

          {/* 縦線装飾 */}
          <div className="absolute top-0 left-1/4 w-px h-1/3 bg-gradient-to-b from-transparent via-[#3d3d3b]/8 to-transparent" />
          <div className="absolute bottom-0 right-1/3 w-px h-1/4 bg-gradient-to-t from-transparent via-[#3d3d3b]/8 to-transparent" />
        </div>

        {/* コンテンツ */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-[#2a2a28] leading-[1.3] mb-10">
            <span className="hero-title-line block">そこにいる人の</span>
            <span className="hero-title-line block">
              <span className="text-[#8b4513] font-normal">心地よさ</span>を大切にした
            </span>
            <span className="hero-title-line block">空間づくり。</span>
          </h1>
          <p className="hero-subtitle text-base sm:text-lg text-[#5a5a58] leading-loose max-w-2xl mx-auto mb-14">
            内装・店舗設計・レジン造作まで、
            <br className="sm:hidden" />
            人の感情や動きに寄り添い、
            <br />
            記憶に残る体験をデザインします。
          </p>
          <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleContact}
              className="group px-10 py-4 bg-[#2a2a28] text-[#f7f6f3] text-sm tracking-[0.15em] rounded-none hover:bg-[#3d3d3b] transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-[#2a2a28] focus:ring-offset-2 relative overflow-hidden"
            >
              <span className="relative z-10">無料相談する</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#8b4513]/20 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
            </button>
            <button
              onClick={() => document.getElementById("process")?.scrollIntoView({ behavior: "smooth" })}
              className="px-10 py-4 border border-[#2a2a28]/20 text-[#2a2a28] text-sm tracking-[0.15em] rounded-none hover:border-[#2a2a28]/50 hover:bg-[#2a2a28]/5 transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-[#2a2a28]/50 focus:ring-offset-2"
            >
              相談の流れを見る
            </button>
          </div>
        </div>

        {/* スクロールインジケーター */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
          <span className="text-[10px] tracking-[0.3em] text-[#5a5a58]/60 writing-vertical">SCROLL</span>
          <div className="w-px h-12 bg-gradient-to-b from-[#2a2a28]/30 to-transparent relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-[#8b4513]/50 animate-scroll-line" />
          </div>
        </div>

        {/* 波形ディバイダー */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-16 sm:h-20">
            <path d="M0,60 C360,80 720,40 1080,55 C1260,62 1380,65 1440,60 L1440,80 L0,80 Z" fill="#f7f6f3" />
          </svg>
        </div>
      </section>

      {/* ===== 2. コンセプト ===== */}
      <section className="py-28 sm:py-36 bg-[#f7f6f3] relative">
        {/* 背景装飾 */}
        <div className="absolute top-20 right-10 w-32 h-32 border border-[#2a2a28]/5 rounded-full" />
        <div className="absolute bottom-20 left-10 w-24 h-24 border border-[#8b4513]/5" style={{ transform: "rotate(45deg)" }} />

        <div className="max-w-3xl mx-auto px-6">
          <div className="fade-section text-center">
            <p className="text-xs tracking-[0.4em] text-[#8b4513] mb-8 font-medium">CONCEPT</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-[#2a2a28] leading-relaxed mb-10">
              見た目の美しさだけでなく、
              <br />
              その空間で過ごす人の
              <br />
              「<span className="text-[#8b4513]">心地よさ</span>」と「<span className="text-[#8b4513]">体験</span>」を設計する。
            </h2>
            <div className="w-12 h-px bg-[#2a2a28]/20 mx-auto mb-10" />
            <p className="text-[#5a5a58] leading-[2.2] text-sm sm:text-base">
              私たちは空間を「つくる」のではなく「設計」します。
              <br />
              そこに訪れる人が、どう感じ、どう動き、何を記憶に残すか。
              <br />
              心理学と設計の融合で、記憶に残る空間体験を創出します。
            </p>
          </div>
        </div>
      </section>

      {/* ===== 3. 提供価値 ===== */}
      <section className="py-28 sm:py-36 bg-[#2a2a28] relative overflow-hidden">
        {/* 背景パターン */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="fade-section text-center mb-20">
            <p className="text-xs tracking-[0.4em] text-[#c9a86c] mb-4 font-medium">VALUE</p>
            <h2 className="text-2xl sm:text-3xl font-light text-[#f7f6f3]">
              私たちが大切にしていること
            </h2>
          </div>

          <div className="stagger-cards grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
            {values.map((v, i) => (
              <div
                key={i}
                className="card-item group flex flex-col p-10 sm:p-12 bg-[#f7f6f3] border-t-2 border-[#8b4513]/60 hover:border-[#8b4513] transition-all duration-500 min-h-[320px]"
              >
                <div className="kanji-icon w-16 h-16 flex items-center justify-center text-3xl font-light text-[#8b4513] border border-[#8b4513]/30 rounded-full mb-8 group-hover:bg-[#8b4513] group-hover:text-[#f7f6f3] transition-all duration-500">
                  {v.icon}
                </div>
                <h3 className="text-lg font-medium text-[#2a2a28] mb-4 tracking-wide">{v.title}</h3>
                <p className="text-sm text-[#5a5a58] leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4. サービス内容 ===== */}
      <section className="py-28 sm:py-36 bg-[#f7f6f3] relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="fade-section text-center mb-20">
            <p className="text-xs tracking-[0.4em] text-[#8b4513] mb-4 font-medium">SERVICE</p>
            <h2 className="text-2xl sm:text-3xl font-light text-[#2a2a28]">
              サービス内容
            </h2>
          </div>

          <div className="stagger-cards grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <div
                key={i}
                className="card-item group h-full flex flex-col p-8 bg-white border border-[#2a2a28]/5 hover:border-[#8b4513]/30 hover:shadow-xl hover:shadow-[#2a2a28]/5 transition-all duration-500"
              >
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-2xl font-light text-[#8b4513]/40 group-hover:text-[#8b4513] transition-colors duration-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-base font-medium text-[#2a2a28]">{s.title}</h3>
                </div>
                <p className="text-sm text-[#5a5a58] leading-relaxed flex-grow">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 5. プロセス ===== */}
      <section id="process" className="py-28 sm:py-36 bg-[#e8e4dd] relative overflow-hidden">
        {/* 背景の円弧 */}
        <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-full opacity-5" viewBox="0 0 1000 500" preserveAspectRatio="none">
          <circle cx="500" cy="800" r="600" fill="none" stroke="#2a2a28" strokeWidth="1" />
          <circle cx="500" cy="900" r="700" fill="none" stroke="#2a2a28" strokeWidth="0.5" />
        </svg>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="fade-section text-center mb-20">
            <p className="text-xs tracking-[0.4em] text-[#8b4513] mb-4 font-medium">PROCESS</p>
            <h2 className="text-2xl sm:text-3xl font-light text-[#2a2a28]">
              ご相談から完成まで
            </h2>
          </div>

          {/* プロセスライン（PC） */}
          <div className="hidden lg:block relative mb-16">
            <div className="process-line absolute top-6 left-[8%] right-[8%] h-px bg-[#2a2a28]/20 origin-left" />
          </div>

          <div className="stagger-cards grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-4">
            {process.map((p, i) => (
              <div key={i} className="card-item text-center relative">
                <div className="relative z-10">
                  <span className="inline-flex items-center justify-center w-12 h-12 text-lg font-light text-[#f7f6f3] bg-[#2a2a28] rounded-full mb-6">
                    {p.num}
                  </span>
                  <h3 className="text-sm font-medium text-[#2a2a28] mb-2">{p.title}</h3>
                  <p className="text-xs text-[#5a5a58] leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 6. 事例 ===== */}
      <section className="py-28 sm:py-36 bg-[#f7f6f3] relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute top-20 left-10 w-64 h-64 opacity-[0.03]" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="#2a2a28" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#2a2a28" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="40" fill="none" stroke="#2a2a28" strokeWidth="0.5" />
          </svg>
          <svg className="absolute bottom-20 right-10 w-48 h-48 opacity-[0.03]" viewBox="0 0 200 200">
            <rect x="40" y="40" width="120" height="120" fill="none" stroke="#8b4513" strokeWidth="0.5" transform="rotate(15 100 100)" />
            <rect x="60" y="60" width="80" height="80" fill="none" stroke="#8b4513" strokeWidth="0.5" transform="rotate(15 100 100)" />
          </svg>
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="fade-section text-center mb-20">
            <p className="text-xs tracking-[0.4em] text-[#8b4513] mb-4 font-medium">WORKS</p>
            <h2 className="text-2xl sm:text-3xl font-light text-[#2a2a28] mb-4">
              空間づくりの事例
            </h2>
            <p className="text-sm text-[#5a5a58]">
              画像ではなく「何を考え、どう変わったか」でお伝えします
            </p>
          </div>

          <div className="stagger-cards grid grid-cols-1 md:grid-cols-3 gap-6">
            {cases.map((c, i) => (
              <div
                key={i}
                className="card-item group bg-white border border-[#2a2a28]/5 hover:border-[#8b4513]/20 transition-all duration-500 overflow-hidden"
              >
                {/* 抽象的なビジュアル表現 */}
                <div className="relative h-40 bg-gradient-to-br from-[#e8e4dd] to-[#f0ede8] overflow-hidden">
                  {/* 空間イメージのSVG */}
                  {i === 0 && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice">
                      {/* 美容サロン - 曲線と円で柔らかさを表現 */}
                      <defs>
                        <linearGradient id="salon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#8b4513" stopOpacity="0.1" />
                          <stop offset="100%" stopColor="#2a2a28" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <ellipse cx="150" cy="80" rx="100" ry="50" fill="url(#salon-grad)" className="group-hover:scale-110 transition-transform duration-700 origin-center" />
                      <circle cx="80" cy="60" r="30" fill="none" stroke="#8b4513" strokeWidth="0.5" opacity="0.3" />
                      <circle cx="220" cy="100" r="25" fill="none" stroke="#2a2a28" strokeWidth="0.5" opacity="0.2" />
                      <path d="M50,120 Q150,60 250,120" fill="none" stroke="#8b4513" strokeWidth="1" opacity="0.15" className="group-hover:opacity-30 transition-opacity duration-500" />
                      <line x1="100" y1="30" x2="100" y2="130" stroke="#2a2a28" strokeWidth="0.3" opacity="0.1" />
                      <line x1="200" y1="30" x2="200" y2="130" stroke="#2a2a28" strokeWidth="0.3" opacity="0.1" />
                    </svg>
                  )}
                  {i === 1 && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice">
                      {/* カフェ - 有機的な形と温かみ */}
                      <defs>
                        <linearGradient id="cafe-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#a0522d" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#8b4513" stopOpacity="0.12" />
                        </linearGradient>
                      </defs>
                      <path d="M0,100 Q75,60 150,80 T300,70 L300,160 L0,160 Z" fill="url(#cafe-grad)" className="group-hover:translate-y-[-5px] transition-transform duration-700" />
                      <rect x="120" y="50" width="60" height="80" fill="none" stroke="#2a2a28" strokeWidth="0.5" opacity="0.15" rx="2" />
                      <circle cx="150" cy="90" r="15" fill="#8b4513" opacity="0.08" />
                      <line x1="60" y1="40" x2="60" y2="120" stroke="#8b4513" strokeWidth="0.5" opacity="0.1" />
                      <line x1="240" y1="50" x2="240" y2="110" stroke="#8b4513" strokeWidth="0.5" opacity="0.1" />
                      <ellipse cx="60" cy="80" rx="20" ry="30" fill="none" stroke="#a0522d" strokeWidth="0.5" opacity="0.2" />
                    </svg>
                  )}
                  {i === 2 && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 160" preserveAspectRatio="xMidYMid slice">
                      {/* ショールーム - 直線的でモダン */}
                      <defs>
                        <linearGradient id="show-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#2a2a28" stopOpacity="0.05" />
                          <stop offset="50%" stopColor="#1e3a5f" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#2a2a28" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <rect x="20" y="40" width="260" height="80" fill="url(#show-grad)" className="group-hover:scale-[1.02] transition-transform duration-700 origin-center" />
                      <line x1="80" y1="20" x2="80" y2="140" stroke="#2a2a28" strokeWidth="0.5" opacity="0.15" />
                      <line x1="150" y1="20" x2="150" y2="140" stroke="#2a2a28" strokeWidth="0.5" opacity="0.15" />
                      <line x1="220" y1="20" x2="220" y2="140" stroke="#2a2a28" strokeWidth="0.5" opacity="0.15" />
                      <rect x="90" y="55" width="40" height="50" fill="none" stroke="#8b4513" strokeWidth="0.5" opacity="0.2" />
                      <rect x="170" y="55" width="40" height="50" fill="none" stroke="#8b4513" strokeWidth="0.5" opacity="0.2" />
                      <circle cx="110" cy="80" r="8" fill="#8b4513" opacity="0.1" />
                      <circle cx="190" cy="80" r="8" fill="#8b4513" opacity="0.1" />
                    </svg>
                  )}
                  {/* オーバーレイテキスト */}
                  <div className="absolute bottom-3 right-3 text-[10px] tracking-[0.2em] text-[#2a2a28]/30 font-light">
                    CASE {String(i + 1).padStart(2, "0")}
                  </div>
                </div>

                <div className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 text-xs tracking-wider text-[#f7f6f3] bg-[#2a2a28]">
                      {c.type}
                    </span>
                    <span className="text-[10px] text-[#5a5a58]">{c.location}</span>
                  </div>

                  <p className="text-xs text-[#8b4513] mb-4">{c.size}</p>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] tracking-[0.2em] text-[#5a5a58]/70 mb-1">目的</p>
                      <p className="text-sm text-[#2a2a28]">{c.purpose}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.2em] text-[#5a5a58]/70 mb-1">工夫</p>
                      <p className="text-sm text-[#5a5a58] leading-relaxed">{c.approach}</p>
                    </div>
                    <div className="pt-4 border-t border-[#2a2a28]/10">
                      <p className="text-[10px] tracking-[0.2em] text-[#8b4513] mb-1">変化</p>
                      <p className="text-sm text-[#2a2a28] font-medium">{c.result}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 7. FAQ ===== */}
      <section className="py-28 sm:py-36 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="fade-section text-center mb-16">
            <p className="text-xs tracking-[0.4em] text-[#8b4513] mb-4 font-medium">FAQ</p>
            <h2 className="text-2xl sm:text-3xl font-light text-[#2a2a28]">
              よくあるご質問
            </h2>
          </div>

          <div className="space-y-0">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b border-[#2a2a28]/10">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-start gap-4 py-6 text-left focus:outline-none group"
                  aria-expanded={openFaq === i}
                >
                  <span className="text-sm font-medium text-[#8b4513] mt-0.5">Q.</span>
                  <span className="flex-1 text-sm sm:text-base text-[#2a2a28] group-hover:text-[#8b4513] transition-colors duration-300">
                    {faq.q}
                  </span>
                  <span className="text-xl text-[#5a5a58] transition-transform duration-300" style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0)" }}>
                    +
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-500"
                  style={{ maxHeight: openFaq === i ? "300px" : "0", opacity: openFaq === i ? 1 : 0 }}
                >
                  <div className="pb-6 pl-8">
                    <p className="text-sm text-[#5a5a58] leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 8. CTA ===== */}
      <section className="py-32 sm:py-40 bg-[#2a2a28] relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0">
          <svg className="absolute top-0 right-0 w-1/2 h-full opacity-5" viewBox="0 0 500 500">
            <circle cx="400" cy="100" r="200" fill="none" stroke="#f7f6f3" strokeWidth="0.5" />
            <circle cx="450" cy="400" r="150" fill="none" stroke="#f7f6f3" strokeWidth="0.5" />
          </svg>
          <svg className="absolute bottom-0 left-0 w-1/3 h-full opacity-5" viewBox="0 0 300 500">
            <rect x="50" y="100" width="100" height="100" fill="none" stroke="#f7f6f3" strokeWidth="0.5" transform="rotate(15 100 150)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="fade-section">
            <p className="text-xs tracking-[0.4em] text-[#c9a86c] mb-8 font-medium">CONTACT</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-[#f7f6f3] leading-relaxed mb-8">
              空間のことで、
              <br />
              少しでも気になることがあれば
            </h2>
            <p className="text-[#f7f6f3]/60 text-sm leading-loose mb-14">
              「まだ具体的に決まっていない」という段階でも大丈夫です。
              <br />
              お話を聞かせていただくだけでも、きっと何かのヒントになります。
              <br />
              まずはお気軽にご相談ください。
            </p>
            <button
              onClick={handleContact}
              className="group px-14 py-5 bg-[#f7f6f3] text-[#2a2a28] text-sm tracking-[0.2em] rounded-none hover:bg-[#c9a86c] hover:text-[#2a2a28] transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-[#f7f6f3] focus:ring-offset-2 focus:ring-offset-[#2a2a28] relative overflow-hidden"
            >
              <span className="relative z-10">無料で相談してみる</span>
            </button>
          </div>
        </div>
      </section>

      {/* ===== カスタムスタイル ===== */}
      <style jsx>{`
        .writing-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        @keyframes scroll-line {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(200%);
          }
        }
        .animate-scroll-line {
          animation: scroll-line 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
