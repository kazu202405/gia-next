"use client";

import { useState, useCallback } from "react";
import { DiagnosticIntro } from "./diagnostic-intro";
import { DiagnosticQuestion, type Question } from "./diagnostic-question";
import { DiagnosticResult } from "./diagnostic-result";

// ── Question Data ──────────────────────────────────

const DOMAINS = [
  "意思決定",
  "習慣設計",
  "コミュニケーション",
  "リーダーシップ",
  "モチベーション",
  "環境設計",
] as const;

const DOMAIN_ANGLES = [0, 60, 120, 180, 240, 300];

const QUESTIONS: Question[] = [
  // Domain 0: 意思決定
  { id: 1, domain: "意思決定", domainIndex: 0, text: "大事な判断をするとき、「なんとなく」ではなく、数字や事実をもとに決めていますか？" },
  { id: 2, domain: "意思決定", domainIndex: 0, text: "「誰がどう決めるか」のルールが明確で、メンバー全員がそれを理解していますか？" },
  { id: 3, domain: "意思決定", domainIndex: 0, text: "迷ったとき、「何を基準に判断すべきか」に立ち返れる仕組みがありますか？" },
  // Domain 1: 習慣設計
  { id: 4, domain: "習慣設計", domainIndex: 1, text: "新しく始めたルールや仕組みが、3ヶ月後もちゃんと続いていますか？" },
  { id: 5, domain: "習慣設計", domainIndex: 1, text: "毎日の業務の中に、「これをやれば成果が出る」という型がありますか？" },
  { id: 6, domain: "習慣設計", domainIndex: 1, text: "やるべきことを「頑張って思い出す」のではなく、自然と手が動く仕組みになっていますか？" },
  // Domain 2: コミュニケーション
  { id: 7, domain: "コミュニケーション", domainIndex: 2, text: "「それ、ちょっと違うと思います」と、メンバー同士が気軽に言い合える雰囲気がありますか？" },
  { id: 8, domain: "コミュニケーション", domainIndex: 2, text: "必要な情報が、必要な人にちゃんと届いていますか？「聞いてない」が頻発していませんか？" },
  { id: 9, domain: "コミュニケーション", domainIndex: 2, text: "会議で「一部の人だけが話して終わり」ではなく、全員が意見を出せていますか？" },
  // Domain 3: リーダーシップ
  { id: 10, domain: "リーダーシップ", domainIndex: 3, text: "上司がいないとき、チームは自分たちで判断して動けていますか？" },
  { id: 11, domain: "リーダーシップ", domainIndex: 3, text: "リーダーは「あれやって、これやって」ではなく、メンバーが自ら動きたくなる関わり方をしていますか？" },
  { id: 12, domain: "リーダーシップ", domainIndex: 3, text: "会社の目指す方向を、メンバーが自分の言葉で語れるくらい浸透していますか？" },
  // Domain 4: モチベーション
  { id: 13, domain: "モチベーション", domainIndex: 4, text: "メンバーは「やらされている」ではなく、「自分からやりたい」と感じて働いていますか？" },
  { id: 14, domain: "モチベーション", domainIndex: 4, text: "結果だけでなく、「どう頑張ったか」のプロセスもきちんと認められていますか？" },
  { id: 15, domain: "モチベーション", domainIndex: 4, text: "メンバーが「最近、自分成長してるな」と実感できる場面がありますか？" },
  // Domain 5: 環境設計
  { id: 16, domain: "環境設計", domainIndex: 5, text: "使っているツールや仕事場は、「仕事がはかどる」と感じられる状態ですか？" },
  { id: 17, domain: "環境設計", domainIndex: 5, text: "集中したいときは集中でき、相談したいときはすぐ話せる、そんな環境がありますか？" },
  { id: 18, domain: "環境設計", domainIndex: 5, text: "「本当にやるべきこと」と「やらなくていいこと」が明確に区別されていますか？" },
];

// ── Domain Advice ──────────────────────────────────

interface DomainAdviceLevel {
  advice: string;
  example: string;
  evidence: string;
}

const DOMAIN_ADVICE: Record<string, { high: DomainAdviceLevel; mid: DomainAdviceLevel; low: DomainAdviceLevel }> = {
  意思決定: {
    high: {
      advice: "「なんとなく」ではなく、ちゃんと根拠を持って判断できている組織です。この調子で、判断のプロセスをチーム全体に広げていきましょう。",
      example: "ある製造業では、チェックリスト型の判断プロセスを導入したことで、会議時間が30%短縮。「誰が見ても同じ判断になる」仕組みが、スピードと精度の両方を上げました。",
      evidence: "ノーベル経済学賞のカーネマン教授の研究によると、構造化された判断プロセスを使うだけで、誤った判断が最大40%減少するというデータがあります。",
    },
    mid: {
      advice: "判断の仕組みはありますが、「結局、社長が決める」になりがちかも。大事な判断に使えるチェックリストを1つ作るだけで、かなり変わります。",
      example: "ある企業では月1回「判断の振り返り会」を始めたところ、同じミスの再発が半減。「あのとき、なぜその判断をしたか」を振り返るだけで、次の判断の質が上がりました。",
      evidence: "心理学者ゲイリー・クラインの「プレモーテム」手法では、判断の前に「もし失敗したらその原因は？」と考えるだけで、判断精度が30%向上するとされています。",
    },
    low: {
      advice: "判断が「あの人次第」になっていませんか？ まずは「何を基準に決めるか」を紙に書き出すところから始めましょう。それだけで判断のブレが減ります。",
      example: "ある小売業では、判断基準を3つだけ明文化しただけで、店長不在時の「判断待ち」がほぼゼロに。現場のスタッフが自信を持って動けるようになりました。",
      evidence: "コロンビア大学のアイエンガー教授の研究では、判断基準が明確なほど意思決定のスピードと満足度が向上し、「決められない」ストレスが大幅に減ることがわかっています。",
    },
  },
  習慣設計: {
    high: {
      advice: "一度決めたことがちゃんと続く組織です。この仕組みを「見える化」して、新しく入った人にも引き継げるようにすると、さらに強くなります。",
      example: "ある企業では業務チェックリストを「見える化」して共有した結果、新人の戦力化が2ヶ月早まりました。「暗黙の型」を形にするだけで、引き継ぎの質が激変します。",
      evidence: "MIT習慣研究ラボの研究では、習慣のループ（きっかけ→行動→報酬）を可視化すると、その定着率は飛躍的に向上することがわかっています。",
    },
    mid: {
      advice: "新しいルールは作るけど、気づいたら元通り…ということはありませんか？「いつ・何をきっかけに・何をする」を具体的に決めると定着しやすくなります。",
      example: "ある企業では「毎朝5分の振り返り」を既存の朝礼にくっつけたところ、3ヶ月後も95%が継続。新しい行動は、すでにやっていることに「ついでに」乗せるのがコツです。",
      evidence: "スタンフォード大学のBJ・フォッグ教授の行動デザイン研究では、既存の習慣に新しい行動を紐づけると、定着率が約3倍になることが実証されています。",
    },
    low: {
      advice: "「やろう！」と決めたことが続かない傾向があります。まずは1つだけ、毎日の業務に組み込める小さな習慣から試してみましょう。",
      example: "ある企業では、週に1つだけ「これだけはやる」を決めるルールを導入。半年後には業務効率が20%改善し、「続いた」という成功体験がチームの自信になりました。",
      evidence: "行動科学の「小さな習慣」理論では、小さな習慣の積み重ねは複利のように成果を生むとされています。毎日1%の改善で、1年後には37倍の差になる計算です。",
    },
  },
  コミュニケーション: {
    high: {
      advice: "メンバー同士が率直に話せる、とても良い雰囲気ができています。この空気を大事にしながら、さらに建設的な議論を増やしていきましょう。",
      example: "ある企業では「良い話も悪い話も即共有」を文化にしたところ、問題の早期発見率が3倍に。小さな火種のうちに消せるから、大きなトラブルが激減しました。",
      evidence: "ハーバード大学のエドモンドソン教授の研究では、心理的安全性の高いチームはパフォーマンスが最大40%向上するとされています。",
    },
    mid: {
      advice: "情報は流れていますが、「一方通行」になっていませんか？ 定期的に1対1で話す時間を作るだけで、双方向のやりとりがグッと増えます。",
      example: "ある企業では週1回15分の1on1を導入したところ、「聞いてない」というクレームが8割減少。たった15分が、情報の断絶を劇的に解消しました。",
      evidence: "マーカス・バッキンガムらの研究によると、週1回のチェックインがあるだけで、従業員のエンゲージメントが約2倍に向上することがわかっています。",
    },
    low: {
      advice: "「聞いてない」「知らなかった」が多くなっていませんか？ まずは週1回、全員が安心して話せる場を作ることから始めましょう。",
      example: "ある企業では匿名で意見を出せるデジタルボックスを設置したところ、改善提案が月3件から月20件に増加。「言っても大丈夫」と思えるだけで、人はこんなに話し出します。",
      evidence: "Googleの「プロジェクト・アリストテレス」の調査で、成果を出すチームの最大の共通点は「心理的安全性」であることが明らかになりました。",
    },
  },
  リーダーシップ: {
    high: {
      advice: "リーダーがいなくても自分たちで動ける、頼もしいチームです。次のリーダーを育てることにも目を向けると、組織はもっと強くなります。",
      example: "ある企業では「判断の権限マップ」を全員に公開したところ、リーダー不在時の意思決定スピードが2倍に。誰が何を決めていいか明確なだけで、チームは自走します。",
      evidence: "ダニエル・ピンクの動機づけ研究によると、自律性を与えられた社員は創造性とパフォーマンスが大幅に向上し、離職率も低下します。",
    },
    mid: {
      advice: "リーダーは頑張っていますが、「リーダー頼み」の部分も。任せられることは少しずつ任せて、メンバーの「自分で決める力」を伸ばしましょう。",
      example: "あるリーダーが「これは任せる」リストを作ったところ、自分の時間が週10時間浮いて戦略に集中できるように。メンバーも「任されている」と感じて成長が加速しました。",
      evidence: "シチュエーショナル・リーダーシップ理論では、メンバーの成熟度に合わせて関わり方を変えると、成長スピードが2倍になるとされています。",
    },
    low: {
      advice: "リーダーが抱え込みすぎていませんか？ まずは小さなことから「自分で判断してOK」の範囲を広げてみましょう。リーダーの負担も減り、チームも成長します。",
      example: "ある企業では「今日の判断は自分で決めてOK」の範囲を明示しただけで、リーダーへの確認が6割減少。リーダーの残業も減り、チームの判断力も上がりました。",
      evidence: "エドワード・デシの自己決定理論によると、「自分で決められる」という実感があるだけで、人の内発的モチベーションは劇的に向上します。",
    },
  },
  モチベーション: {
    high: {
      advice: "メンバーが「自分からやりたい」と思って動けている組織です。一人ひとりの強みを活かせる場面をさらに増やして、この勢いを維持しましょう。",
      example: "ある企業では「強み発見ワークショップ」を実施したところ、社員満足度が25%向上。自分の得意なことを活かせる仕事が増えたことで、前向きなエネルギーが組織全体に広がりました。",
      evidence: "ポジティブ心理学の父セリグマン教授の研究によると、自分の強みを活かして働く人はエンゲージメントが6倍高くなります。",
    },
    mid: {
      advice: "やる気はありますが、「給料のため」「怒られないため」に偏っていませんか？「自分で選べる」「成長を実感できる」場面を意識的に作ると、やる気の質が変わります。",
      example: "ある企業では「今週のナイスプレー」をチームで共有する仕組みを作ったところ、離職率が15%低下。「ちゃんと見てもらえている」実感が、やる気の質を変えました。",
      evidence: "デシとライアンの自己決定理論では、「自律性」「有能感」「関係性」の3つが満たされると内発的動機づけが最大化されるとされています。",
    },
    low: {
      advice: "メンバーの表情、最近曇っていませんか？ まずは「ちゃんと見てるよ」と伝えること。小さな成功を一緒に喜ぶだけで、空気は変わり始めます。",
      example: "ある企業では毎週金曜に「今週できたこと」を3つ書き出す習慣を導入。たった1ヶ月でチームの雰囲気が目に見えて改善し、メンバーから自発的な提案が出始めました。",
      evidence: "ハーバードのアマビール教授の「進捗の法則」では、仕事のモチベーションに最も影響するのは給料でも評価でもなく、「小さな前進を実感できること」だと明らかになっています。",
    },
  },
  環境設計: {
    high: {
      advice: "仕事がはかどる環境がしっかり整っています。定期的に「もっと良くならないか？」と見直す習慣を続けましょう。",
      example: "ある企業では四半期ごとに「業務のムダ洗い出し会」を実施した結果、年間200時間の工数を削減。「当たり前」を疑う習慣が、じわじわと効いてきます。",
      evidence: "リチャード・セイラー教授のナッジ理論では、環境のデフォルトを変えるだけで、望ましい行動が大幅に増加することが実証されています。",
    },
    mid: {
      advice: "環境は整っていますが、「もったいない」と感じる部分はありませんか？ まずは「一番時間がかかっている作業」を見つけて、やり方を見直してみましょう。",
      example: "ある企業では「集中タイム」（通知オフの2時間）を導入したところ、1人あたりの生産性が35%向上。集中できる時間を「仕組みで確保する」だけで、これだけ変わります。",
      evidence: "ジョージタウン大学のニューポート教授の「ディープワーク」研究によると、集中できる環境の有無が、知的労働の成果を2〜4倍左右するとされています。",
    },
    low: {
      advice: "ツールや環境が足を引っ張っていませんか？ まずは一番ストレスを感じている業務を1つ選んで、そのやり方を変えるところから始めましょう。",
      example: "ある企業では最もストレスの多い業務を1つだけ自動化した結果、残業時間が月15時間減少。たった1つの改善が、チーム全体のストレスを大きく下げました。",
      evidence: "認知科学者ドナルド・ノーマンのヒューマンエラー研究では、人がミスをするのは「人のせい」ではなく「環境のせい」。環境を変えれば行動は自然と変わることが実証されています。",
    },
  },
};

function getAdviceLevel(domain: string, score: number): DomainAdviceLevel {
  const advice = DOMAIN_ADVICE[domain];
  if (!advice) return { advice: "", example: "", evidence: "" };
  if (score >= 70) return advice.high;
  if (score >= 45) return advice.mid;
  return advice.low;
}

// ── State Types ────────────────────────────────────

type Phase = "intro" | "questions" | "result";

// ── Component ──────────────────────────────────────

export function DiagnosticApp() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const handleStart = useCallback(() => {
    setPhase("questions");
    setCurrentQuestionIndex(0);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleAnswer = useCallback(
    (questionId: number, score: number) => {
      setAnswers((prev) => ({ ...prev, [questionId]: score }));

      // Auto-advance after a short delay
      setTimeout(() => {
        if (currentQuestionIndex < QUESTIONS.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          setPhase("result");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 300);
    },
    [currentQuestionIndex]
  );

  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }, [currentQuestionIndex]);

  const handleRetry = useCallback(() => {
    setPhase("intro");
    setCurrentQuestionIndex(0);
    setAnswers({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Calculate domain results
  const calculateResults = () => {
    return DOMAINS.map((domain, i) => {
      const domainQuestions = QUESTIONS.filter((q) => q.domainIndex === i);
      const domainAnswers = domainQuestions.map((q) => answers[q.id] || 3);
      const average = domainAnswers.reduce((a, b) => a + b, 0) / domainAnswers.length;
      const score = Math.round(average * 20);

      const adviceLevel = getAdviceLevel(domain, score);
      return {
        label: domain,
        score,
        angle: DOMAIN_ANGLES[i],
        advice: adviceLevel.advice,
        example: adviceLevel.example,
        evidence: adviceLevel.evidence,
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1f33]">
      {phase === "intro" && <DiagnosticIntro onStart={handleStart} />}

      {phase === "questions" && (
        <DiagnosticQuestion
          question={QUESTIONS[currentQuestionIndex]}
          currentIndex={currentQuestionIndex}
          totalQuestions={QUESTIONS.length}
          currentAnswer={answers[QUESTIONS[currentQuestionIndex].id]}
          onAnswer={handleAnswer}
          onBack={handleBack}
          canGoBack={currentQuestionIndex > 0}
        />
      )}

      {phase === "result" && (
        <DiagnosticResult
          domainResults={calculateResults()}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
