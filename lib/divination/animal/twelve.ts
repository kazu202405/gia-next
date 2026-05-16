// 動物占いの 12 基本動物プロファイル、十二運→動物マップ、グループ分類（月／地球／太陽）。
// 動物占いの元ロジックは四柱推命の十二運なので、各動物は十二運の人生段階に対応する。
// 詳細なロジック解説：memory/reference_animal_divination_logic.md
//
// 表記ルール（個性心理學公式）：
//   月（MOON）   = ひらがな表記   こじか・黒ひょう・たぬき・ひつじ（黒ひょうのみ漢字混合）
//   地球（EARTH）= 漢字表記       狼・猿・虎・子守熊
//   太陽（SUN）  = カタカナ表記   チータ・ライオン・ゾウ・ペガサス

import type { JuniUnsei } from "../sanmei/descriptions";

export type BasicAnimal =
  | "狼" | "こじか" | "猿" | "チータ" | "黒ひょう" | "ライオン"
  | "虎" | "たぬき" | "子守熊" | "ゾウ" | "ひつじ" | "ペガサス";

export type AnimalGroup = "月" | "地球" | "太陽";

// 十二運 → 12動物の固定マッピング。
// synchrorich.com / kagenotabi.com で 10 個確定、ライオン=臨官は 60 分類リスト逆算で確定。
export const JUNI_TO_ANIMAL: Record<JuniUnsei, BasicAnimal> = {
  胎:   "狼",
  養:   "こじか",
  長生: "猿",
  沐浴: "チータ",
  冠帯: "黒ひょう",
  臨官: "ライオン",
  帝旺: "虎",
  衰:   "たぬき",
  病:   "子守熊",
  死:   "ゾウ",
  墓:   "ひつじ",
  絶:   "ペガサス",
};

// グループの色設計（案A：月=銀／地球=緑／太陽=オレンジ）。
// 役割色（カード全体）と被らないよう、チップ専用パレットで揃える。
export interface GroupStyle {
  /** 動物カードの背景（淡色）。 */
  bg: string;
  /** チップの背景。 */
  chipBg: string;
  /** チップの枠線。 */
  chipBorder: string;
  /** チップ・文字色。 */
  text: string;
  /** チップ内の丸ドット色。 */
  dot: string;
}

export const GROUP_STYLES: Record<AnimalGroup, GroupStyle> = {
  月:   {
    bg:         "#f4f5f8",
    chipBg:     "#eef0f5",
    chipBorder: "#c5cbd7",
    text:       "#5a6680",
    dot:        "#8a96ab",
  },
  地球: {
    bg:         "#eff5f0",
    chipBg:     "#e6f0e7",
    chipBorder: "#c5d3c8",
    text:       "#2f6b3a",
    dot:        "#5b9070",
  },
  太陽: {
    bg:         "#fbf4ea",
    chipBg:     "#fbeede",
    chipBorder: "#e6c8a3",
    text:       "#8a4a18",
    dot:        "#d97a32",
  },
};

export interface AnimalProfile {
  name: BasicAnimal;
  group: AnimalGroup;
  stage: string;        // 十二運の人生段階
  keyword: string;
  traits: string[];     // 性格特徴（3〜4 個）
}

// 12 動物のプロファイル。動物占い／個性心理學の標準的な性格記述から要約。
export const ANIMAL_PROFILES: Record<BasicAnimal, AnimalProfile> = {
  狼: {
    name: "狼", group: "地球",
    stage: "胎（受胎）",
    keyword: "孤高・独自路線",
    traits: ["一人の時間を大切にする", "型にハマらない発想", "ペースを乱されたくない", "独特の世界観"],
  },
  こじか: {
    name: "こじか", group: "月",
    stage: "養（母体で育つ）",
    keyword: "純粋・人懐っこい",
    traits: ["人を疑わない素直さ", "繊細で傷つきやすい", "甘え上手", "可愛がられる才能"],
  },
  猿: {
    name: "猿", group: "地球",
    stage: "長生（生まれて成長）",
    keyword: "好奇心・スピード",
    traits: ["話題が豊富で人気者", "瞬発力と機転", "飽きっぽさはある", "場を楽しませる"],
  },
  チータ: {
    name: "チータ", group: "太陽",
    stage: "沐浴（出産）",
    keyword: "瞬発力・短期決戦",
    traits: ["スタートダッシュが得意", "目標が見えると速い", "燃え尽きやすい", "結果重視"],
  },
  黒ひょう: {
    name: "黒ひょう", group: "月",
    stage: "冠帯（成人）",
    keyword: "正義感・スマートさ",
    traits: ["かっこよくありたい", "情報通でトレンド好き", "リーダーシップ", "メンツを大事にする"],
  },
  ライオン: {
    name: "ライオン", group: "太陽",
    stage: "臨官（社会的地位確立）",
    keyword: "威厳・百獣の王",
    traits: ["堂々とした存在感", "プライドが高い", "群れの中心になる", "弱みを見せたがらない"],
  },
  虎: {
    name: "虎", group: "地球",
    stage: "帝旺（人生の頂点）",
    keyword: "貫禄・パワフル",
    traits: ["バイタリティと存在感", "勝負に強い", "頼られると応える", "白黒はっきりつけたい"],
  },
  たぬき: {
    name: "たぬき", group: "月",
    stage: "衰（衰退）",
    keyword: "経験値・社交力",
    traits: ["人生経験を活かす", "場を読む力", "丸く収める", "苦労人の渋み"],
  },
  子守熊: {
    name: "子守熊", group: "地球",
    stage: "病（病気）",
    keyword: "癒し・マイペース",
    traits: ["のんびりとした空気感", "サービス精神", "自分の世界に入りやすい", "周囲を和ませる"],
  },
  ゾウ: {
    name: "ゾウ", group: "太陽",
    stage: "死（死）",
    keyword: "努力・継続",
    traits: ["コツコツ積み上げる", "専門性を極める", "粘り強い", "頑固な一面"],
  },
  ひつじ: {
    name: "ひつじ", group: "月",
    stage: "墓（墓に入る）",
    keyword: "和・繋がり",
    traits: ["人と人を繋ぐ", "集団のなかで力を発揮", "情報収集が好き", "断るのが苦手"],
  },
  ペガサス: {
    name: "ペガサス", group: "太陽",
    stage: "絶（全くない状態）",
    keyword: "天才肌・気まぐれ",
    traits: ["自由でとらわれない", "ひらめきで動く", "波がある", "型にはまらない"],
  },
};
