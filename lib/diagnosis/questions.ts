// 売上ボトルネック診断 — 質問バンク（データ）。
// 正本: contexts/projects/gia/sales_bottleneck_diagnosis.md
//
// 各選択肢は上から 3 / 2 / 1 / 0 点（「良い→悪い」の並びで統一）。
// 1項目あたり 4問（満点 12点）→ 採点側で 0〜100 に正規化する。

export type DimensionKey =
  | "acquisition"
  | "closing"
  | "price"
  | "retention"
  | "capacity";

export interface Choice {
  label: string;
  points: 0 | 1 | 2 | 3;
}

export interface Question {
  id: string; // 例: "acquisition-1"
  text: string;
  choices: Choice[];
}

export interface Dimension {
  key: DimensionKey;
  no: number; // 1..5
  title: string; // 集客
  subtitle: string; // リード獲得力
  weight: number; // 重み（合計 1.0）
  questions: Question[];
}

export const INDUSTRIES = [
  "店舗・対面サービス",
  "制作・オンライン",
  "コンサル・士業",
  "物販・EC",
  "その他",
] as const;

// 4択を 3 / 2 / 1 / 0 点で生成するヘルパー。
const choices = (
  labels: [string, string, string, string]
): Choice[] => labels.map((label, i) => ({ label, points: (3 - i) as 0 | 1 | 2 | 3 }));

export const DIMENSIONS: Dimension[] = [
  {
    key: "acquisition",
    no: 1,
    title: "集客",
    subtitle: "リード獲得力",
    weight: 0.2,
    questions: [
      {
        id: "acquisition-1",
        text: "毎月の新規問い合わせ・見込み客の数は？",
        choices: choices([
          "十分に来ている",
          "ちょうど足りている",
          "少し足りない",
          "ほとんど来ない",
        ]),
      },
      {
        id: "acquisition-2",
        text: "新規が来る経路は？",
        choices: choices([
          "複数の安定した経路がある",
          "安定した経路が1つ",
          "紹介頼みで不安定",
          "運まかせ",
        ]),
      },
      {
        id: "acquisition-3",
        text: "集客は仕組みで回っている？",
        choices: choices([
          "自動で回る",
          "半分は仕組み化",
          "毎回がんばる",
          "何もしていない",
        ]),
      },
      {
        id: "acquisition-4",
        text: "広告・発信は効いている実感は？",
        choices: choices([
          "投資して効いている",
          "投資しているが効果は不明",
          "やっていない",
          "やってやめた",
        ]),
      },
    ],
  },
  {
    key: "closing",
    no: 2,
    title: "成約",
    subtitle: "決定力",
    weight: 0.25,
    questions: [
      {
        id: "closing-1",
        text: "問い合わせ → 成約の割合は？",
        choices: choices(["8割以上", "半分前後", "2〜3割", "1割未満"]),
      },
      {
        id: "closing-2",
        text: "価格を伝えたときの反応は？",
        choices: choices([
          "即決が多い",
          "検討の末に決まる",
          "高いと渋られがち",
          "よく逃げられる",
        ]),
      },
      {
        id: "closing-3",
        text: "提案・商談の進め方は？",
        choices: choices([
          "決まった型がある",
          "なんとなく型がある",
          "毎回アドリブ",
          "苦手で避けがち",
        ]),
      },
      {
        id: "closing-4",
        text: "失注（断られた）理由を把握している？",
        choices: choices([
          "把握して改善している",
          "なんとなく分かる",
          "よく分からない",
          "考えたことがない",
        ]),
      },
    ],
  },
  {
    key: "price",
    no: 3,
    title: "単価",
    subtitle: "収益性",
    weight: 0.2,
    questions: [
      {
        id: "price-1",
        text: "客単価は同業と比べて？",
        choices: choices(["高め", "普通", "安め", "おそらく最安級"]),
      },
      {
        id: "price-2",
        text: "この1年で値上げした？",
        choices: choices([
          "した",
          "予定がある",
          "したいが怖い",
          "考えていない",
        ]),
      },
      {
        id: "price-3",
        text: "上位商品・アップセルは？",
        choices: choices([
          "複数あり機能している",
          "1つある",
          "作りたい",
          "ない",
        ]),
      },
      {
        id: "price-4",
        text: "値段の決め方は？",
        choices: choices([
          "提供価値から決める",
          "相場に合わせる",
          "原価＋利益",
          "なんとなく",
        ]),
      },
    ],
  },
  {
    key: "retention",
    no: 4,
    title: "リピート・紹介",
    subtitle: "継続力",
    weight: 0.2,
    questions: [
      {
        id: "retention-1",
        text: "売上に占めるリピート・継続の割合は？",
        choices: choices([
          "大半",
          "半分くらい",
          "2〜3割",
          "ほぼ新規頼み",
        ]),
      },
      {
        id: "retention-2",
        text: "購入後のフォロー・接点は？",
        choices: choices([
          "仕組みで継続的に",
          "たまに",
          "ほとんどない",
          "売って終わり",
        ]),
      },
      {
        id: "retention-3",
        text: "紹介はどれくらい生まれている？",
        choices: choices([
          "安定して回る",
          "たまに生まれる",
          "ほとんどない",
          "頼んだことがない",
        ]),
      },
      {
        id: "retention-4",
        text: "顧客の情報・履歴の管理は？",
        choices: choices([
          "一元管理できている",
          "部分的に",
          "頭の中",
          "管理していない",
        ]),
      },
    ],
  },
  {
    key: "capacity",
    no: 5,
    title: "供給・キャパ",
    subtitle: "捌く力",
    weight: 0.15,
    questions: [
      {
        id: "capacity-1",
        text: "依頼が来ても断る・待たせることは？",
        choices: choices([
          "ない",
          "めったにない",
          "たまにある",
          "よくある",
        ]),
      },
      {
        id: "capacity-2",
        text: "業務のあなた個人への依存度は？",
        choices: choices([
          "仕組みで回る",
          "チームで回る",
          "半分は自分",
          "ほぼ全部自分",
        ]),
      },
      {
        id: "capacity-3",
        text: "手が回らず取りこぼしている感覚は？",
        choices: choices(["ない", "あまりない", "少しある", "強くある"]),
      },
      {
        id: "capacity-4",
        text: "繁忙期に品質・対応は？",
        choices: choices([
          "落ちない仕組みがある",
          "たまに落ちる",
          "よく落ちる",
          "常にギリギリ",
        ]),
      },
    ],
  },
];

// 重みの合計が 1.0 であることを開発時に担保する。
const WEIGHT_SUM = DIMENSIONS.reduce((acc, d) => acc + d.weight, 0);
if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(`診断の重み合計が 1.0 ではありません: ${WEIGHT_SUM}`);
}
