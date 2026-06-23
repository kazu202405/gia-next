import { describe, it, expect } from "vitest";
import { DIMENSIONS, type DimensionKey } from "./questions";
import { scoreDiagnosis, gradeFor, type Answers } from "./score";

// 全問を一律 points 点で埋める
function uniform(points: number): Answers {
  const a: Answers = {};
  for (const dim of DIMENSIONS) {
    for (const q of dim.questions) a[q.id] = points;
  }
  return a;
}

// 特定項目だけ points、それ以外は other 点
function withDimension(
  key: DimensionKey,
  points: number,
  other: number
): Answers {
  const a: Answers = {};
  for (const dim of DIMENSIONS) {
    for (const q of dim.questions) a[q.id] = dim.key === key ? points : other;
  }
  return a;
}

describe("gradeFor", () => {
  it("境界値を正しく判定する", () => {
    expect(gradeFor(100)).toBe("S");
    expect(gradeFor(90)).toBe("S");
    expect(gradeFor(89)).toBe("A");
    expect(gradeFor(75)).toBe("A");
    expect(gradeFor(74)).toBe("B");
    expect(gradeFor(60)).toBe("B");
    expect(gradeFor(59)).toBe("C");
    expect(gradeFor(40)).toBe("C");
    expect(gradeFor(39)).toBe("D");
    expect(gradeFor(0)).toBe("D");
  });
});

describe("scoreDiagnosis", () => {
  it("全問満点なら総合100・S・全項目S", () => {
    const r = scoreDiagnosis(uniform(3));
    expect(r.total).toBe(100);
    expect(r.grade).toBe("S");
    expect(r.dimensions.every((d) => d.grade === "S")).toBe(true);
  });

  it("全問0点なら総合0・D", () => {
    const r = scoreDiagnosis(uniform(0));
    expect(r.total).toBe(0);
    expect(r.grade).toBe("D");
  });

  it("各項目スコアは 0〜100 に正規化される（一律1点=33）", () => {
    const r = scoreDiagnosis(uniform(1));
    // 4問×1点 ÷ 12 ×100 = 33.3 → 33
    expect(r.dimensions.every((d) => d.score === 33)).toBe(true);
  });

  it("最低スコアの項目がボトルネックになる", () => {
    // 単価だけ0点、他は満点
    const r = scoreDiagnosis(withDimension("price", 0, 3));
    expect(r.bottleneck.key).toBe("price");
    expect(r.firstMove).toContain("値上げ");
  });

  it("供給C/D かつ 集客A/S で供給ゲートが効く（広告を増やすなと言う）", () => {
    // 集客=満点(S)、供給=0点(D)、他は満点
    const r = scoreDiagnosis(withDimension("capacity", 0, 3));
    expect(r.supplyGate).toBe(true);
    expect(r.verdict).toContain("需要 > 供給");
    expect(r.dontDo).toContain("広告");
  });

  it("集客が最低なら需要を増やすフェーズと判定する", () => {
    const r = scoreDiagnosis(withDimension("acquisition", 0, 3));
    expect(r.supplyGate).toBe(false);
    expect(r.bottleneck.key).toBe("acquisition");
    expect(r.verdict).toContain("集客");
  });

  it("重みづけ総合＝成約25%が効く（成約のみ満点と集客のみ満点で差が出る）", () => {
    const onlyClosing = scoreDiagnosis(withDimension("closing", 3, 0));
    const onlyAcquisition = scoreDiagnosis(withDimension("acquisition", 3, 0));
    // 成約(0.25) > 集客(0.20) なので成約だけ満点の方が総合が高い
    expect(onlyClosing.total).toBeGreaterThan(onlyAcquisition.total);
    expect(onlyClosing.total).toBe(25);
    expect(onlyAcquisition.total).toBe(20);
  });
});
