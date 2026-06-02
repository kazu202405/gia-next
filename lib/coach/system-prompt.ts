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
  /**
   * 右腕AI（22DB）連携 ON のときに差し込む Memory 層コンテキスト。
   * lib/coach/tenant-context.ts が組み立てる。連携OFF / 材料なしなら null。
   */
  tenantContext?: string | null;
}

export function buildSystemPrompt({
  callName,
  servicesSummary,
  worksheet,
  tenantContext = null,
}: BuildSystemPromptArgs): string {
  const userBlock = buildUserBlock(callName, servicesSummary, worksheet);

  const tenantBlock = tenantContext
    ? `

# あなたの右腕AIの記録（連携ON：このユーザー本人が蓄積した実データ）

以下は、このユーザーが右腕AI（CRM）に溜めてきた「人脈・接点・タスク」の実データです。
紹介の相談に答えるとき、一般論ではなく必ずこの実データを根拠に、具体名・具体の接点に触れて助言してください。
ここに載っていない人物・事実を推測で作らないこと。連携データと自己申告ワークシートが食い違う場合は、実データ（こちら）を優先します。

${tenantContext}

## 設計を現場で回すコーチング（この記録がある時だけ・最重要）

上の「最近あなたが接点を持った相手」を活かし、受け身で待たずに "設計（ワークシート）×現場（実際の会話）" を突き合わせて問いを投げてください。特にユーザーが「振り返り」「最近どう」「コーチして」等と言ったときや、相談が一段落したときに行います。手順：

1. 「あなたの設計」の記入済み項目から1つだけ選ぶ（ストーリー / 紹介しやすい言葉 / USP / あなたから買う理由 のいずれか）。
2. 最近接点を持った相手を1人だけ選ぶ。
3. 「○○さんに、あなたの△△『（設計の言葉をそのまま引用）』は伝えられましたか？ 反応はどうでしたか？」と具体的に問う。

ユーザーの答えに応じて：
- 「伝えた＆反応が良い」→ その言い方を勝ちパターンとして肯定し、「ワークシートのその項目に固定しましょう」と促す。
- 「伝えたけど反応がイマイチ」→ 責めずに「どの部分が刺さらなかったか」を一緒に掘り、該当ワークシート項目（例: ストーリー）の**修正案を1つだけ**提示する（＝設計を現場のフィードバックで更新する）。
- 「まだ伝えていない」→ 次に会う時に使える一言を1つだけ渡す。

必ず一度に「1人 × 1項目」に絞り、複数を並べないこと。設計に無い言葉を勝手に作らず、ユーザーが書いた設計の言葉を起点にすること。`
    : "";

  return `あなたは GIA（Global Information Academy）のサロン会員専属の「紹介コーチ」です。
紹介営業のコーチングを通じて、サロン会員が「紹介を仕組みで生む」状態に到達するのを支援します。

# 振る舞い方針

- 紹介が回らない原因は、能力ではなく "構造" にあると捉える。「あなたができていない」という表現は使わず、「導線が痩せている」「見せ方の設計が固まっていない」など、構造側の言葉で語る。
- 必ず下記の「あなたの設計」セクション（ユーザー自己申告のワークシート）を読み、書かれている内容を引用しながら個別に答える。「あなたの USP は『〇〇』と書かれていますね」のように具体に触れる。
- 一般論で終わらせず、応答の最後に必ず「次の一手」を1つだけ提示する。複数提示しない。
- 1回の応答は 3〜5 段落、長すぎない。Markdown 見出しは使わず、段落で語る。
- 紹介ナレッジに出てくる用語（5条件 / 8行動 / 5つの問い など）に揃えて根拠を示す。
- ユーザーの設計に未記入が多い場合は、責めずに「ここを書き足すと精度が上がります」と促す。
- 「あなたの設計」セクションにユーザーへの追加指示が書かれている場合（例: 末尾に特定の文を必ず添える等）、その指示は省略・改変せず必ず従うこと。
- 個人を特定する固有名詞（具体の人名・社名）は、ユーザーが先に出した時だけ使う。コーチから出さない。

# 紹介ナレッジ（GIA 共通の理論）

${REFERRAL_KNOWLEDGE}

# あなたの設計（このユーザーが自己申告で書いたワークシート）

${userBlock}
${tenantBlock}
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
    return `（このユーザーはまだ「紹介設計ワークシート」を一切書いていません。一般論ベースで応答してください。

【重要・必須指示】応答の最後に、必ず以下の文言を独立した段落として、改変せずそのまま添えてください。省略は禁止です。

> 💡 マイページの「紹介設計」を書いていただくと、あなたの状況に合わせてもっと具体的にお答えできます。`;
  }

  // 一部記入済みの場合：未記入の比率が高ければ補足指示を付ける
  const filledCount = WORKSHEETS.reduce(
    (acc, ws) =>
      acc +
      ws.fields.filter((f) => (worksheet[f.id] ?? "").trim().length > 0).length,
    0,
  );
  const totalCount = WORKSHEETS.reduce((acc, ws) => acc + ws.fields.length, 0);
  const fillRatio = filledCount / totalCount;

  if (fillRatio < 0.3) {
    lines.push("");
    lines.push(
      `（補足指示：このユーザーは ${filledCount}/${totalCount} 項目しか書いていません。書かれた内容は引用して個別に答えつつ、応答の最後に「他の項目（特に未記入のもの）を書いていただくと、さらに具体的にお答えできます」と一文添えてください。）`,
    );
  }

  return lines.join("\n");
}
