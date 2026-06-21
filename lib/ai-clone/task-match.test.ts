import { describe, it, expect } from "vitest";
import { tokenizeTaskQuery, normalizeTaskName } from "./supabase-db";

// ───────────────────────────────────────────────────────────────
// タスク照合トークナイザの characterization テスト。
//
// 背景：実運用で「井上ともよしさんに話した」が
//       「井上ともよしさんへの『補助金の話したい』という約束」に
//       連続部分一致せず complete_task が空振りした（タスクが閉じず再浮上）。
//       searchTasksByName のトークン重なりフォールバックの土台が
//       tokenizeTaskQuery。ここで「特徴トークンが取れること」と
//       「無関係タスクに巻き込まれないこと」を凍結する。
// ───────────────────────────────────────────────────────────────

// searchTasksByName のフォールバック2と同じ照合ロジック（最長トークンから順に
// タスク名へ部分一致を試し、最初に当たったトークンを返す）。
function tokenMatch(query: string, taskName: string): string | null {
  const tn = normalizeTaskName(taskName);
  for (const t of tokenizeTaskQuery(query).map(normalizeTaskName)) {
    if (t.length >= 2 && tn.includes(t)) return t;
  }
  return null;
}

describe("tokenizeTaskQuery", () => {
  it("漢字の連続を特徴トークンとして拾い、助詞で割れない", () => {
    expect(tokenizeTaskQuery("井上ともよしさんに話した")).toEqual(["井上"]);
  });

  it("敬称トークン（さん等）は除外する", () => {
    expect(tokenizeTaskQuery("田中さんに連絡")).not.toContain("さん");
  });

  it("カタカナの固有名も拾える", () => {
    expect(tokenizeTaskQuery("ウェルテックの価格表送った")).toContain(
      "ウェルテック",
    );
  });
});

describe("タスク照合（トークン重なりフォールバック）", () => {
  const hit: [string, string][] = [
    // 実運用バグの再現：完了発話 → 約束タスク
    ["井上ともよしさんに話した", "井上ともよしさんへの「補助金の話したい」という約束"],
    ["代理店候補を考えた", "代理店候補者を考える"],
    ["みやこの議事録まとめた", "みやこ不動産アプリの議事録をまとめる"],
  ];
  for (const [q, name] of hit) {
    it(`一致する: "${q}" → "${name}"`, () => {
      expect(tokenMatch(q, name)).not.toBeNull();
    });
  }

  it("無関係なタスクには巻き込まれない", () => {
    expect(tokenMatch("井上ともよしさんに話した", "高橋さんに見積もりを送る")).toBeNull();
  });
});
