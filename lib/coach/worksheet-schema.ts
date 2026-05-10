// 紹介設計ワークシートのスキーマ定義（3シート × 22項目）。
// 出典: contexts/projects/gia/decks/seminar_referral_slides.html
//   - WS01: スライド16（見せ方の設計）
//   - WS02: スライド18（価値の設計）
//   - WS03: スライド26（仕組み化）
//
// 用途:
//   1. 入力画面 (/members/app/worksheet) のフォーム生成
//   2. 紹介コーチ chat の system prompt に埋め込む context
//   3. 将来 Supabase テーブル `referral_worksheets` の jsonb スキーマと一致させる
//
// 注意:
//   field の id（ws01_01 など）は localStorage / Supabase の永続化キーになるため、
//   後方互換のため変更不可。ラベル・ヒントは安全に編集可能。

export interface WorksheetField {
  /** 永続化キー。 ws<sheet>_<row> 固定。変更不可。 */
  id: string;
  /** 行番号（"01"〜）。UI のナンバリング表示用。 */
  num: string;
  /** 入力欄の見出し。 */
  label: string;
  /** 入力欄の下にうすく出すガイド。スライドの data-hint と同じ。 */
  hint: string;
}

export interface Worksheet {
  /** 永続化キー兼ルーティング識別子。"ws01" 等。 */
  id: "ws01" | "ws02" | "ws03";
  /** 表示用の通し番号。 */
  number: string;
  /** タブやヘッダー表示用の短い見出し。 */
  title: string;
  /** タブ下に薄く出すサブコピー。 */
  subtitle: string;
  /** ワークシート最後に置く完成基準コメント。 */
  closingNote: string;
  fields: WorksheetField[];
}

export const WORKSHEETS: Worksheet[] = [
  {
    id: "ws01",
    number: "01",
    title: "見せ方の設計",
    subtitle: "お客様の目に最初に触れる『届き方』を整える",
    closingNote: "完璧でなくて大丈夫。出てきた言葉を、まず書き留める。",
    fields: [
      {
        id: "ws01_01",
        num: "01",
        label: "話題になる要素",
        hint: "ギャップ／意外性／話したくなる要素",
      },
      {
        id: "ws01_02",
        num: "02",
        label: "ストーリー",
        hint: "きっかけ・想い・一言で話せるストーリー",
      },
      {
        id: "ws01_03",
        num: "03",
        label: "イメージ",
        hint: "こんな人に合う／こんな場面で役立つ／使うとこうなる",
      },
      {
        id: "ws01_04",
        num: "04",
        label: "相手のタイプ（DISC）",
        hint: "お客様で多いのは D／I／S／C どれ？／その人に響く一言は",
      },
      {
        id: "ws01_05",
        num: "05",
        label: "紹介しやすい言葉",
        hint: "「〇〇って会社あってさ…」／30秒で説明すると",
      },
      {
        id: "ws01_06",
        num: "06",
        label: "思い出される接点",
        hint: "今ある接点／増やしたい接点／発信で伝えること",
      },
      {
        id: "ws01_07",
        num: "07",
        label: "安心して勧める工夫",
        hint: "不安ポイント／保証・安心材料／紹介後の流れ",
      },
      {
        id: "ws01_08",
        num: "08",
        label: "まとめ（1文で）",
        hint: "紹介される時の一言 ＝",
      },
    ],
  },
  {
    id: "ws02",
    number: "02",
    title: "価値の設計",
    subtitle: "『紹介したくなる価値』を自社の言葉で言語化する",
    closingNote:
      "最後にこの1文が完成すれば合格：『〇〇な人に、〇〇の悩みに対し、〇〇を提供する会社』",
    fields: [
      {
        id: "ws02_01",
        num: "01",
        label: "誰の何を解決",
        hint: "お客様像／主な悩み／よくある困りごと",
      },
      {
        id: "ws02_02",
        num: "02",
        label: "本当に欲しい結果",
        hint: "欲しいもの／その先の状態／最終的に得たいもの",
      },
      {
        id: "ws02_03",
        num: "03",
        label: "特徴 → 利益",
        hint: "自社の特徴 → 相手にとっての良いこと",
      },
      {
        id: "ws02_04",
        num: "04",
        label: "USP",
        hint: "他との違い／魅力／特に向いている相手",
      },
      {
        id: "ws02_05",
        num: "05",
        label: "MVV",
        hint: "Mission ／ Vision ／ Value",
      },
      {
        id: "ws02_06",
        num: "06",
        label: "不安を減らす",
        hint: "お客様の不安／先回り／保証・対応策",
      },
      {
        id: "ws02_07",
        num: "07",
        label: "あなたから買う理由",
        hint: "なぜあなた／なぜ今／紹介したくなる理由",
      },
    ],
  },
  {
    id: "ws03",
    number: "03",
    title: "仕組み化",
    subtitle: "行動・担当・タイミング・数字を、自社の言葉で",
    closingNote:
      "全部決めなくていい。今月動かす『1つ』が書ければ、仕組みは動き始める。",
    fields: [
      {
        id: "ws03_01",
        num: "01",
        label: "必要な行動",
        hint: "紹介が起こる前に必要な行動 ①〜⑤",
      },
      {
        id: "ws03_02",
        num: "02",
        label: "測る行動（先行指標）",
        hint: "接点数・声取得数・配信数・入口案内数 など",
      },
      {
        id: "ws03_03",
        num: "03",
        label: "結果指標（KPI）",
        hint: "紹介件数・商談数・成約率・リピート率",
      },
      {
        id: "ws03_04",
        num: "04",
        label: "ボトルネック",
        hint: "接点不足／話題性／入口なし／声不足／紹介後対応",
      },
      {
        id: "ws03_05",
        num: "05",
        label: "今月の改善アクション",
        hint: "1つでOK。必ず実行する1個を書く",
      },
    ],
  },
];

/** 全 field の id 一覧（型安全な永続化キー）。 */
export type WorksheetFieldId = string;

/** Supabase の jsonb で保持する形（フラット）。referral_worksheets.data の型。 */
export type WorksheetData = Record<WorksheetFieldId, string>;

/** 進捗率（0〜1）。空白文字のみのフィールドは未記入扱い。 */
export function calcProgress(data: WorksheetData): number {
  const total = WORKSHEETS.reduce((acc, ws) => acc + ws.fields.length, 0);
  const filled = WORKSHEETS.reduce(
    (acc, ws) =>
      acc +
      ws.fields.filter((f) => (data[f.id] ?? "").trim().length > 0).length,
    0,
  );
  return total === 0 ? 0 : filled / total;
}

/** シート単位の進捗（記入済 / 全体）。 */
export function calcSheetProgress(
  sheetId: Worksheet["id"],
  data: WorksheetData,
): { filled: number; total: number } {
  const sheet = WORKSHEETS.find((w) => w.id === sheetId);
  if (!sheet) return { filled: 0, total: 0 };
  const filled = sheet.fields.filter(
    (f) => (data[f.id] ?? "").trim().length > 0,
  ).length;
  return { filled, total: sheet.fields.length };
}
