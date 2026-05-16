// 個性心理學（動物占い）5キャラ算出。
//
// ユーザー指定（2026-05-16）のハイブリッド方式：
//   - 本質     = 日柱の番号
//   - 意思決定 = 月柱の番号
//   - 表面     = 年柱の番号
//   - 隠れ     = 本質（日柱）+ 40（mod 60）
//   - 希望     = 本質（日柱）+ 20（mod 60）
//
// 表示順は [本質, 意思決定, 表面, 隠れ, 希望] で固定。
// オフセット値（20/40）は弦本式の +10 系を採用。流派によって +12/+24 等もあり、
// 五島さんの公式結果と合わない場合は本ファイルのオフセットを調整する想定。

import {
  getAnimalNumber, getAnimalByNumber,
  type Animal60,
} from "./sixty";
import type { Jikkan, Junishi } from "../kanshi/constants";

export type CharacterRole = "本質" | "意思決定" | "表面" | "隠れ" | "希望";

export interface KoseishinCharacter {
  role: CharacterRole;
  number: number;       // 1〜60
  animal: Animal60;
  description: string;  // 各役割の意味の説明
  source: string;       // 番号の由来（"日柱由来" / "月柱由来" / "本質+40" 等）
}

/** 1〜60 にラップ。0 になったら 60 として扱う。 */
function wrap60(n: number): number {
  const r = ((n - 1) % 60 + 60) % 60;
  return r + 1;
}

const ROLE_DESCRIPTIONS: Record<CharacterRole, string> = {
  本質: "生まれ持った本来の自分。一人でいるとき・心を許した相手の前で出る素の姿。",
  意思決定: "判断するときの軸・決め方の癖。重要な決断を下す瞬間に出る性格。",
  表面: "他人から見られる外向きの顔。第一印象や社交の場で表れる雰囲気。",
  隠れ: "自分でも気づきにくい無意識のキャラ。本人より周囲が察知することが多い。",
  希望: "人生で求めるもの・理想の姿。どんな自分になりたいかという憧れ。",
};

/**
 * 日柱・月柱・年柱の干支から 5 キャラを算出する。
 * 並びは [本質, 意思決定, 表面, 隠れ, 希望]。
 */
export function calculateKoseishin(
  dayKan: Jikkan, dayShi: Junishi,
  monthKan: Jikkan, monthShi: Junishi,
  yearKan: Jikkan, yearShi: Junishi,
): KoseishinCharacter[] | null {
  const dayN = getAnimalNumber(dayKan, dayShi);
  const monthN = getAnimalNumber(monthKan, monthShi);
  const yearN = getAnimalNumber(yearKan, yearShi);
  if (dayN < 0 || monthN < 0 || yearN < 0) return null;

  const hiddenN = wrap60(dayN + 40);
  const hopeN = wrap60(dayN + 20);

  const items: Array<{ role: CharacterRole; number: number; source: string }> = [
    { role: "本質",     number: dayN,    source: "日柱由来" },
    { role: "意思決定", number: monthN,  source: "月柱由来" },
    { role: "表面",     number: yearN,   source: "年柱由来" },
    { role: "隠れ",     number: hiddenN, source: "本質+40" },
    { role: "希望",     number: hopeN,   source: "本質+20" },
  ];

  return items.map(({ role, number, source }) => ({
    role,
    number,
    animal: getAnimalByNumber(number)!,
    description: ROLE_DESCRIPTIONS[role],
    source,
  }));
}
