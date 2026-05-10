// 紹介コーチ chat の system prompt 構築。
// サーバ側 (app/api/coach/chat/route.ts) で OpenAI に渡す前に組み立てる。
//
// 構成:
//   1. 役割・振る舞い方針
//   2. 紹介ナレッジ（GIA 共通の理論。lib/coach/knowledge.ts から）
//   3. ユーザーのワークシート内容（記入済み項目のみを抜粋）
//   4. ユーザーの基本属性（呼び名・サービス概要）

import { REFERRAL_KNOWLEDGE } from "./knowledge";
import { WORKSHEETS, type WorksheetData } from "./worksheet-schema";

export interface BuildSystemPromptArgs {
  /** 呼び名（nickname > name の優先度で親が解決済み）。null なら呼びかけなし。 */
  callName: string | null;
  /** applicants.services_summary。null なら省略。 */
  servicesSummary: string | null;
  /** referral_worksheets.data の中身。空オブジェクトなら未記入扱い。 */
  worksheet: WorksheetData;
}

export function buildSystemPrompt({
  callName,
  servicesSummary,
  worksheet,
}: BuildSystemPromptArgs): string {
  const userBlock = buildUserBlock(callName, servicesSummary, worksheet);

  return `あなたは GIA（Global Information Academy）のサロン会員専属の「紹介コーチ」です。
紹介営業のコーチングを通じて、サロン会員が「紹介を仕組みで生む」状態に到達するのを支援します。

# 振る舞い方針

- 紹介が回らない原因は、能力ではなく "構造" にあると捉える。「あなたができていない」という表現は使わず、「導線が痩せている」「見せ方の設計が固まっていない」など、構造側の言葉で語る。
- 必ず下記の「あなたの設計」セクション（ユーザー自己申告のワークシート）を読み、書かれている内容を引用しながら個別に答える。「あなたの USP は『〇〇』と書かれていますね」のように具体に触れる。
- 一般論で終わらせず、応答の最後に必ず「次の一手」を1つだけ提示する。複数提示しない。
- 1回の応答は 3〜5 段落、長すぎない。Markdown 見出しは使わず、段落で語る。
- 紹介ナレッジに出てくる用語（5条件 / 8行動 / 5つの問い など）に揃えて根拠を示す。
- ユーザーの設計に未記入が多い場合は、責めずに「ここを書き足すと精度が上がります」と促す。
- 個人を特定する固有名詞（具体の人名・社名）は、ユーザーが先に出した時だけ使う。コーチから出さない。

# 紹介ナレッジ（GIA 共通の理論）

${REFERRAL_KNOWLEDGE}

# あなたの設計（このユーザーが自己申告で書いたワークシート）

${userBlock}
`;
}

function buildUserBlock(
  callName: string | null,
  servicesSummary: string | null,
  worksheet: WorksheetData,
): string {
  const lines: string[] = [];

  if (callName) lines.push(`呼び名: ${callName}さん`);
  if (servicesSummary) lines.push(`サービス概要: ${servicesSummary}`);

  for (const sheet of WORKSHEETS) {
    const rows = sheet.fields
      .map((f) => {
        const v = (worksheet[f.id] ?? "").trim();
        if (!v) return null;
        return `- ${f.label}: ${v}`;
      })
      .filter((row): row is string => row !== null);

    if (rows.length === 0) continue;
    lines.push("");
    lines.push(`## ${sheet.title}`);
    lines.push(...rows);
  }

  if (lines.length === 0) {
    return `（このユーザーはまだワークシートを書いていません。一般論ベースで応答しつつ、応答の終わりに「マイページの『紹介設計』を書き始めると、より具体的に助言できます」と促してください。）`;
  }

  return lines.join("\n");
}
