// Core OS「AIと対話して下書き」の設定。
// 各セクションごとに「会員に聞く数問の質問」と「AIが埋める出力フィールド」を定義する。
// クライアント（CoreOsAssistDialog）と API（/api/clone/coreos-assist）の両方から参照。
// ※ bracket パス([slug])を避けるため lib 配下に置き、SectionKey 等の型には依存しない。

export interface AssistQuestion {
  /** answers のキー */
  key: string;
  /** 質問文 */
  label: string;
  /** 入力欄プレースホルダ */
  placeholder: string;
}

export interface AssistFieldSpec {
  /** フォームのフィールド名（DBフィールド名に一致） */
  key: string;
  /** AIが何を埋めるかの説明（プロンプト用） */
  desc: string;
}

export interface AssistConfig {
  /** ダイアログ見出し */
  title: string;
  /** 会員に聞く数問 */
  questions: AssistQuestion[];
  /** AIが生成する出力フィールド */
  fields: AssistFieldSpec[];
}

export const CORE_OS_ASSIST = {
  mission: {
    title: "ミッションをAIと作る",
    questions: [
      {
        key: "business",
        label: "どんな事業をしていますか？（誰に何を提供しているか）",
        placeholder: "例：中小企業向けに経理代行をしている",
      },
      {
        key: "why",
        label: "なぜその事業を続けているのですか？（想い・きっかけ）",
        placeholder: "例：経理で消耗する社長を何人も見てきたから",
      },
      {
        key: "values",
        label: "仕事で大事にしている価値観は？",
        placeholder: "例：誠実さ、長く付き合うこと、スピード",
      },
    ],
    fields: [
      { key: "mission", desc: "ミッション。誰の何をどう変えるかを一文で。" },
      { key: "values_tags", desc: "価値観。単語をカンマ区切りで3〜5個。" },
      { key: "target_world", desc: "目指す世界。事業が広がった先の理想を一文で。" },
      { key: "not_doing", desc: "やらないこと。一見良くてもやらないと決めること。" },
      {
        key: "value_to_customer",
        desc: "お客様に届けたい本質的な価値を一文で。",
      },
    ],
  },
  "three-year-plan": {
    title: "3年計画をAIと作る",
    questions: [
      {
        key: "ideal",
        label: "3年後、どうなっていたいですか？（売上・働き方・状態）",
        placeholder: "例：売上が安定し、自分が現場に出なくても回っている",
      },
      {
        key: "pillars",
        label: "今の事業の柱と、これから増やしたいものは？",
        placeholder: "例：今は経理代行。これからコンサルも増やしたい",
      },
      {
        key: "quit",
        label: "3年後にはやめていたい働き方は？",
        placeholder: "例：自分が動かないと売上が止まる状態",
      },
    ],
    fields: [
      {
        key: "plan_name",
        desc: "計画名。年を入れると分かりやすい（例：2029年までの成長計画）。",
      },
      {
        key: "ideal_state_in_3y",
        desc: "3年後の理想状態。数字と状態の両方で。",
      },
      { key: "business_pillars", desc: "事業の柱。カンマ区切りで。" },
      { key: "revenue_model", desc: "収益モデル。どこからどう稼ぐか。" },
      { key: "assets_to_build", desc: "3年で築きたい資産（お金以外）。" },
      { key: "work_style_to_quit", desc: "やめたい働き方。" },
    ],
  },
} satisfies Record<string, AssistConfig>;

export type AssistableSection = keyof typeof CORE_OS_ASSIST;

export function getAssistConfig(section: string): AssistConfig | null {
  return (CORE_OS_ASSIST as Record<string, AssistConfig>)[section] ?? null;
}
