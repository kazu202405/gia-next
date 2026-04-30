// 紹介依頼コピペボタン用のテンプレート文面ビルダー。
// プロフィール詳細から「主催者経由で紹介してほしい」相手の情報を渡し、
// LINE 送信向けのメッセージ雛形を返す。

export interface ReferralTemplateInput {
  /** 紹介してほしい人の名前 */
  targetName: string;
  /** 肩書き or 職種（roleTitle / jobTitle）。無ければ undefined */
  targetTitle?: string;
}

/**
 * 紹介依頼の本文テンプレートを組み立てる。
 * - targetTitle が指定されていれば「（〜）」で名前の後ろに添える
 * - 「紹介をお願いしたい理由」は利用者がモーダル内で書き換える前提のプレースホルダ
 */
export function buildReferralRequestText({
  targetName,
  targetTitle,
}: ReferralTemplateInput): string {
  const titleSuffix = targetTitle ? `（${targetTitle}）` : "";
  return [
    `GIAのアプリで ${targetName}さん${titleSuffix}のプロフィールを拝見しました。`,
    ``,
    `【紹介をお願いしたい理由】`,
    `（ここに自由にご記入ください）`,
    ``,
    `ご都合つきましたら、お繋ぎいただけますと嬉しいです。`,
    `よろしくお願いいたします。`,
    ``,
    `---`,
    `紹介希望: ${targetName}さん${titleSuffix}`,
  ].join("\n");
}

/** 主催者の LINE 公式アカウント URL（mock）。実運用時に差し替え。 */
export const HOST_LINE_URL = "https://line.me/R/ti/p/@gia-host";
