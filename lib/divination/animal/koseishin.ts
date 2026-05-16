// 動物占い（個性心理學）5アニマル算出。
//
// ロジック（2026-05-16 五島さんの実例で 4/5 検証済み）：
//   本質     = 日柱の干支の十二運 → 12動物（さらに本質のみ 60 分類で深掘り）
//   表面     = 日干 vs 月柱地支 の十二運 → 12動物
//   意思決定 = 日干 vs 年柱地支 の十二運 → 12動物
//   希望     = 月柱の干（月干）vs 月支 の十二運 → 12動物
//   隠れ     = 未確定（命式内では算出できない可能性）
//
// 詳細：memory/reference_animal_divination_logic.md

import { getJuniUnsei } from "../sanmei/inyo";
import type { JuniUnsei } from "../sanmei/descriptions";
import type { Jikkan, Junishi } from "../kanshi/constants";
import { JUNI_TO_ANIMAL, ANIMAL_PROFILES, type BasicAnimal, type AnimalProfile } from "./twelve";
import { getAnimalByKanshi, type Animal60 } from "./sixty";

export type CharacterRole = "本質" | "意思決定" | "表面" | "隠れ" | "希望";

export interface KoseishinCharacter {
  role: CharacterRole;
  animal: BasicAnimal;          // 12 動物名（本質も含めて必ず入る）
  profile: AnimalProfile;       // 12 動物のプロファイル
  juniUnsei: JuniUnsei | null;  // 算出元の十二運（隠れは null）
  source: string;               // 計算式の説明（UI 表示用）
  /** 本質キャラのみ 60 分類の詳細が入る（修飾子付き動物名・番号）。 */
  sixty?: Animal60;
  /** 算出不可（隠れキャラなど）の場合 true。 */
  unresolved?: boolean;
}

const ROLE_DESCRIPTIONS: Record<CharacterRole, string> = {
  本質:     "生まれ持った本来の自分。一人でいるとき・心を許した相手の前で出る素の姿。",
  意思決定: "判断するときの軸・決め方の癖。重要な決断を下す瞬間に出る性格。",
  表面:     "他人から見られる外向きの顔。第一印象や社交の場で表れる雰囲気。",
  隠れ:     "自分でも気づきにくい無意識のキャラ。窮地で顔を出すと言われる。",
  希望:     "人生で求めるもの・理想の姿。どんな自分になりたいかという憧れ。",
};

/**
 * 日柱・月柱・年柱の干支から動物占い 5 アニマルを算出する。
 * 並びは [本質, 意思決定, 表面, 隠れ, 希望]。
 * 隠れキャラは現時点でロジック未確定のため unresolved=true で返す。
 */
export function calculateKoseishin(
  dayKan: Jikkan, dayShi: Junishi,
  monthKan: Jikkan, monthShi: Junishi,
  yearKan: Jikkan, yearShi: Junishi,
): KoseishinCharacter[] {
  // 本質：日柱の干と地支の十二運
  const essenceUnsei = getJuniUnsei(dayKan, dayShi);
  const essenceAnimal = JUNI_TO_ANIMAL[essenceUnsei];
  const essenceSixty = getAnimalByKanshi(dayKan, dayShi) ?? undefined;

  // 意思決定：日干 vs 年支の十二運
  const decisionUnsei = getJuniUnsei(dayKan, yearShi);
  const decisionAnimal = JUNI_TO_ANIMAL[decisionUnsei];

  // 表面：日干 vs 月支の十二運
  const surfaceUnsei = getJuniUnsei(dayKan, monthShi);
  const surfaceAnimal = JUNI_TO_ANIMAL[surfaceUnsei];

  // 希望：月干 vs 月支の十二運（日干は使わない、月柱内の組み合わせ）
  const hopeUnsei = getJuniUnsei(monthKan, monthShi);
  const hopeAnimal = JUNI_TO_ANIMAL[hopeUnsei];

  return [
    {
      role: "本質",
      animal: essenceAnimal,
      profile: ANIMAL_PROFILES[essenceAnimal],
      juniUnsei: essenceUnsei,
      source: `日柱 ${dayKan}${dayShi} の十二運（${essenceUnsei}）`,
      sixty: essenceSixty,
    },
    {
      role: "意思決定",
      animal: decisionAnimal,
      profile: ANIMAL_PROFILES[decisionAnimal],
      juniUnsei: decisionUnsei,
      source: `日干 ${dayKan} × 年支 ${yearShi}（${decisionUnsei}）`,
    },
    {
      role: "表面",
      animal: surfaceAnimal,
      profile: ANIMAL_PROFILES[surfaceAnimal],
      juniUnsei: surfaceUnsei,
      source: `日干 ${dayKan} × 月支 ${monthShi}（${surfaceUnsei}）`,
    },
    {
      role: "隠れ",
      // ロジック未確定のため、UI には「調査中」を出す。データは placeholder。
      animal: "オオカミ", // ダミー（unresolved の場合 UI 側で非表示）
      profile: ANIMAL_PROFILES["オオカミ"],
      juniUnsei: null,
      source: "算出ロジック調査中",
      unresolved: true,
    },
    {
      role: "希望",
      animal: hopeAnimal,
      profile: ANIMAL_PROFILES[hopeAnimal],
      juniUnsei: hopeUnsei,
      source: `月柱 ${monthKan}${monthShi} の十二運（${hopeUnsei}）`,
    },
  ];
}

export { ROLE_DESCRIPTIONS };
