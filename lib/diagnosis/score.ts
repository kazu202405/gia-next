// 売上ボトルネック診断 — 採点エンジン（純関数）。
// 正本: contexts/projects/gia/sales_bottleneck_diagnosis.md

import { DIMENSIONS, type Dimension, type DimensionKey } from "./questions";

export type Grade = "S" | "A" | "B" | "C" | "D";
export type GradeColor = "green" | "amber" | "red";

/** questionId -> 選択された点数（0〜3） */
export type Answers = Record<string, number>;

export interface DimensionResult {
  key: DimensionKey;
  no: number;
  title: string;
  subtitle: string;
  score: number; // 0〜100（四捨五入）
  grade: Grade;
  color: GradeColor;
}

export interface DiagnosisResult {
  total: number; // 0〜100
  grade: Grade;
  dimensions: DimensionResult[];
  bottleneck: DimensionResult; // 最も詰まっている項目
  supplyGate: boolean; // 「需要 > 供給」上書きが効いているか
  verdict: string; // 需要 vs 供給 の一言
  firstMove: string; // まず打つ一手
  dontDo: string; // 今やらなくていいこと
}

export function gradeFor(score: number): Grade {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function colorFor(grade: Grade): GradeColor {
  if (grade === "S" || grade === "A") return "green";
  if (grade === "B") return "amber";
  return "red";
}

function dimensionScore(dim: Dimension, answers: Answers): number {
  const max = dim.questions.length * 3;
  const sum = dim.questions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
  return Math.round((sum / max) * 100);
}

const FIRST_MOVE: Record<DimensionKey, string> = {
  acquisition:
    "露出を増やす（広告・発信・紹介依頼）。ただし出しても反応が薄いなら、増額よりも“出し先と訴求”の見直しが先です。",
  closing:
    "提案・商談に“型”を作る。価格の見せ方と、決め手になる一言を固定化し、失注理由を毎回記録して一つずつ潰す。",
  price:
    "値上げ、または上位商品を1つ作る。上げた分はほぼ利益に乗ります。怖さは“価値ベースの根拠”で埋める。",
  retention:
    "売って終わりにしない接点を仕組みに（フォロー・定期連絡・紹介の声かけ）。まず顧客情報を一元管理する。",
  capacity:
    "捌く力を上げる（仕組み化・外注・採用）。あるいは値上げで需要を間引き、同じ稼働で単価を上げる。",
};

const DONT_DO: Record<DimensionKey, string> = {
  acquisition:
    "単価やリピートの作り込みは後回しでOK。入口が細いうちは効果が出にくい。",
  closing:
    "新規集客を増やすこと。今は“決まらない”のが問題なので、母数より打率を上げる。",
  price:
    "数をこなして売上を作ること。単価が低いまま量を追うと、忙しいのに手元に残らない。",
  retention:
    "新規を追い続けること。リピートの蛇口が閉じたままだと、穴の空いたバケツに水を注ぐのと同じ。",
  capacity:
    "広告費を増やすこと。今は取りこぼしが増えるだけで逆効果です。",
};

export function scoreDiagnosis(answers: Answers): DiagnosisResult {
  const dimensions: DimensionResult[] = DIMENSIONS.map((dim) => {
    const score = dimensionScore(dim, answers);
    const grade = gradeFor(score);
    return {
      key: dim.key,
      no: dim.no,
      title: dim.title,
      subtitle: dim.subtitle,
      score,
      grade,
      color: colorFor(grade),
    };
  });

  const total = Math.round(
    DIMENSIONS.reduce((acc, dim, i) => acc + dimensions[i].score * dim.weight, 0)
  );
  const grade = gradeFor(total);

  // ボトルネック = 最低スコア。同点は no が小さい方（＝上流）を優先。
  const bottleneck = [...dimensions].sort(
    (a, b) => a.score - b.score || a.no - b.no
  )[0];

  // 供給ゲート: 供給が C/D かつ 集客が A/S → 「需要 > 供給」と判定して打ち手を上書き。
  const capacity = dimensions.find((d) => d.key === "capacity")!;
  const acquisition = dimensions.find((d) => d.key === "acquisition")!;
  const supplyGate =
    (capacity.grade === "C" || capacity.grade === "D") &&
    (acquisition.grade === "A" || acquisition.grade === "S");

  let verdict: string;
  let firstMove: string;
  let dontDo: string;

  if (supplyGate) {
    verdict =
      "判定：需要は足りているのに、捌けていません（需要 > 供給）。集客より“供給側”を直すフェーズです。";
    firstMove = FIRST_MOVE.capacity;
    dontDo = DONT_DO.capacity;
  } else if (bottleneck.key === "acquisition") {
    verdict = "判定：入口（集客）が最大の詰まり。まず需要を増やすフェーズです。";
    firstMove = FIRST_MOVE.acquisition;
    dontDo = DONT_DO.acquisition;
  } else {
    verdict = `判定：集客より“中身”が詰まっています（${bottleneck.title}）。今ある見込み客を活かすフェーズです。`;
    firstMove = FIRST_MOVE[bottleneck.key];
    dontDo = DONT_DO[bottleneck.key];
  }

  return {
    total,
    grade,
    dimensions,
    bottleneck,
    supplyGate,
    verdict,
    firstMove,
    dontDo,
  };
}
