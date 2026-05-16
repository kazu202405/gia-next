// 月律分野（節気司令分日法）。
// 月支の蔵干が、節入りからの経過日数によって「余気 → 中気 → 本気」と切り替わる。
// 算命学の陽占（人体星図）の中心星算出で、伝統的な蔵干主気の代わりに使うことで
// アポロン山崎ほか多くのサイトの計算結果と整合する。
//
// 日数の区切りは流派により 1〜2 日の誤差があるが、最も流布している区切りを採用：
//   - 子・卯（2気のみ）        ：0〜9日（前月本気の余気）／10日以降（本気）
//   - 午・酉                   ：0〜9日（余気）／10〜19日（中気）／20日以降（本気）
//   - 丑・辰・未・戌（土用月）  ：0〜8日／9〜11日／12日以降
//   - 寅・巳・申・亥（四生四旺）：0〜6日／7〜13日／14日以降
//
// 詳細：memory/reference_animal_divination_logic.md

import type { Junishi, Jikkan } from "./constants";

interface BunyaPhase {
  /** この区間の終了日（節入りからの日数、含む）。最後の段階は Infinity。 */
  untilDay: number;
  /** この区間に司令する蔵干。 */
  kan: Jikkan;
  /** 表記用（余気・中気・本気）。 */
  role: "余気" | "中気" | "本気";
}

export const ZOUKAN_BUNYA: Record<Junishi, BunyaPhase[]> = {
  子: [
    { untilDay: 9,        kan: "壬", role: "余気" },
    { untilDay: Infinity, kan: "癸", role: "本気" },
  ],
  丑: [
    { untilDay: 8,        kan: "癸", role: "余気" },
    { untilDay: 11,       kan: "辛", role: "中気" },
    { untilDay: Infinity, kan: "己", role: "本気" },
  ],
  寅: [
    { untilDay: 6,        kan: "戊", role: "余気" },
    { untilDay: 13,       kan: "丙", role: "中気" },
    { untilDay: Infinity, kan: "甲", role: "本気" },
  ],
  卯: [
    { untilDay: 9,        kan: "甲", role: "余気" },
    { untilDay: Infinity, kan: "乙", role: "本気" },
  ],
  辰: [
    { untilDay: 8,        kan: "乙", role: "余気" },
    { untilDay: 11,       kan: "癸", role: "中気" },
    { untilDay: Infinity, kan: "戊", role: "本気" },
  ],
  巳: [
    { untilDay: 6,        kan: "戊", role: "余気" },
    { untilDay: 13,       kan: "庚", role: "中気" },
    { untilDay: Infinity, kan: "丙", role: "本気" },
  ],
  午: [
    { untilDay: 9,        kan: "丙", role: "余気" },
    { untilDay: 19,       kan: "己", role: "中気" },
    { untilDay: Infinity, kan: "丁", role: "本気" },
  ],
  未: [
    { untilDay: 8,        kan: "丁", role: "余気" },
    { untilDay: 11,       kan: "乙", role: "中気" },
    { untilDay: Infinity, kan: "己", role: "本気" },
  ],
  申: [
    { untilDay: 6,        kan: "戊", role: "余気" },
    { untilDay: 13,       kan: "壬", role: "中気" },
    { untilDay: Infinity, kan: "庚", role: "本気" },
  ],
  酉: [
    { untilDay: 9,        kan: "庚", role: "余気" },
    { untilDay: Infinity, kan: "辛", role: "本気" },
  ],
  戌: [
    { untilDay: 8,        kan: "辛", role: "余気" },
    { untilDay: 11,       kan: "丁", role: "中気" },
    { untilDay: Infinity, kan: "戊", role: "本気" },
  ],
  亥: [
    { untilDay: 6,        kan: "戊", role: "余気" },
    { untilDay: 13,       kan: "甲", role: "中気" },
    { untilDay: Infinity, kan: "壬", role: "本気" },
  ],
};

/** 月支と節入りからの経過日数（0始まり）で、月律分野の蔵干を返す。 */
export function getZoukanWithBunya(shi: Junishi, daysSinceSetsuiri: number): Jikkan {
  const phases = ZOUKAN_BUNYA[shi];
  for (const phase of phases) {
    if (daysSinceSetsuiri <= phase.untilDay) return phase.kan;
  }
  return phases[phases.length - 1].kan;
}

/** 月支と節入りからの経過日数で、月律分野のロール（余気・中気・本気）も含めて返す。 */
export function getZoukanBunyaPhase(
  shi: Junishi, daysSinceSetsuiri: number,
): { kan: Jikkan; role: "余気" | "中気" | "本気" } {
  const phases = ZOUKAN_BUNYA[shi];
  for (const phase of phases) {
    if (daysSinceSetsuiri <= phase.untilDay) {
      return { kan: phase.kan, role: phase.role };
    }
  }
  const last = phases[phases.length - 1];
  return { kan: last.kan, role: last.role };
}
