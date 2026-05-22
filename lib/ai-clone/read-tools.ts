// AI Clone の Read 系 Tool Calling 基盤（query / 雑談中の検索専用）。
//
// 目的:
//   handleQuery（質問・相談・雑談モード）の中で AI Clone が必要に応じて
//   過去データを引っ張れるようにする。書込みではないので副作用なし。
//
// 設計:
//   tools.ts の mutate ツール群とは別 export にして、handleQuery 側でだけ
//   ロードする。仕様は OpenAI function spec。executor は supabase-db の
//   search*ForChat ヘルパーを呼び、結果は JSON シリアライズしやすい平たい
//   構造で返す（AI が文脈として扱いやすいよう）。
//
// なぜ Read を Tool 化するか:
//   handleQuery は従来「人物名抽出 → 関連情報 pre-fetch → systemPrompt 埋込」
//   という固定 context だった。これだと「キーワード検索」「日付範囲指定」
//   「過去の判断事例参照」など、AI が自律的に検索したい場面に対応できない。
//   tool calling 化すれば AI が「何を／いつ／誰を」検索するか自分で決められる。

import type { ChatCompletionTool } from "openai/resources/chat/completions";
import {
  searchConversationsForChat,
  searchTasksForChat,
  searchPeopleForChat,
  searchDecisionCasesForChat,
} from "./supabase-db";

// ===========================================================
// Tool 定義（OpenAI function spec）
// ===========================================================

export const aiCloneReadTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_conversations",
      description:
        "過去の会話・打ち合わせ・面談ログを検索する。" +
        "ユーザーが「○○について話したやつ教えて」「今月のSlackのやり取り」「Aさんと最近何話した」など、" +
        "過去の会話を参照する必要がある時に使う。" +
        "【重要】「Aさんと何を話したか」のように特定の人物との会話を聞かれた場合は、" +
        "必ず person_name にその名前を入れること。query には名前を入れない。" +
        "会話本文には参加者の名前が載っていないことが多く、query（本文検索）では取りこぼすため。" +
        "person_name は人物リンク経由で確実に絞り込む（部分一致・敬称や全角半角スペースは自動吸収）。" +
        "query は『契約』『旅費』のような話題キーワード専用（要約・本文・次のアクションを横断 ilike）。" +
        "結果は最大10件、新しい順。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "話題キーワード専用。要約・本文・次のアクションに横断 ilike。例：「契約」「旅費」「来週の見積」。" +
              "人物名はここに入れない（person_name を使う）。",
          },
          person_name: {
            type: "string",
            description:
              "登場人物の名前。指定するとその人との会話だけに人物リンク経由で絞る。" +
              "「Aさんと何話した？」型は必ずここに名前を入れる。敬称（さん/様 等）や全角半角スペースは自動で吸収される。",
          },
          date_from: {
            type: "string",
            description: "開始日 YYYY-MM-DD。「今月」「今週」「過去30日」等を絶対化",
          },
          date_to: {
            type: "string",
            description: "終了日 YYYY-MM-DD",
          },
          channels: {
            type: "array",
            items: { type: "string", enum: ["Slack", "LINE", "Email", "対面", "電話", "その他"] },
            description: "チャンネルで絞る",
          },
          importance: {
            type: "array",
            items: { type: "string", enum: ["S", "A", "B", "C"] },
            description: "重要度で絞る",
          },
          limit: {
            type: "number",
            description: "結果件数の上限。既定10。要約してから渡したい時は3〜5に絞っても良い",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_tasks",
      description:
        "タスクを検索する。" +
        "「期限切れのタスク何ある？」「○○系のタスク残ってる？」「来週までに終わらせるべきものは？」など、" +
        "タスクを参照する必要がある時に使う。" +
        "結果は最大10件、期限近い順。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "キーワード（タスク名・目的に横断 ilike）",
          },
          statuses: {
            type: "array",
            items: { type: "string", enum: ["未着手", "進行中", "完了", "保留"] },
            description: "状態で絞る",
          },
          priorities: {
            type: "array",
            items: { type: "string", enum: ["高", "中", "低"] },
            description: "優先度で絞る",
          },
          due_on_or_before: {
            type: "string",
            description: "この日付以前に期限が来るタスク（YYYY-MM-DD）",
          },
          overdue_only: {
            type: "boolean",
            description: "true で期限切れかつ未完了のタスクのみ",
          },
          limit: { type: "number", description: "結果件数の上限。既定10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_people",
      description:
        "人物（人脈・顧客・パートナー）を検索する。" +
        "「○○系の業界の人いる？」「重要度Sの人ピックアップ」「○○さんから紹介された人」など、" +
        "人物リストを参照する必要がある時に使う。" +
        "結果は最大10件、最近更新順。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "名前・会社名・役職に横断 ilike",
          },
          importance: {
            type: "array",
            items: { type: "string", enum: ["S", "A", "B", "C"] },
          },
          temperature: {
            type: "array",
            items: { type: "string", enum: ["熱い", "様子見", "冷えてる"] },
          },
          met_context: {
            type: "array",
            items: { type: "string" },
            description: "出会った場所（例：「◯◯セミナー」「△△サロン」）",
          },
          referrer_name: {
            type: "string",
            description: "紹介元の人物名（部分一致）。指定するとその人から紹介された人だけに絞る",
          },
          has_action: {
            type: "boolean",
            description: "true で「次のアクション」が登録されている人だけに絞る",
          },
          limit: { type: "number", description: "結果件数の上限。既定10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_decision_cases",
      description:
        "過去の判断事例ログを検索する（AI 五島の核）。" +
        "「過去に似た判断あった？」「同じような相談、前にも対応したことある？」など、" +
        "本人の過去の判断・対応・学びを参照する必要がある時に使う。" +
        "ユーザー確認済み（confirmed=true）の事例のみが対象（誤抽出ガード）。" +
        "結果は最大10件、新しい順。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "キーワード（出来事・見立て・対応・結果・学び・意図・再利用条件を横断 ilike）。" +
              "例：「不安」「契約破棄」「断り方」「価格交渉」",
          },
          confirmed_only: {
            type: "boolean",
            description:
              "確認済み事例のみに絞るか。既定 true。AI 抽出だけで未確認のドラフトを含めたい時のみ false に",
          },
          date_from: { type: "string", description: "YYYY-MM-DD" },
          date_to: { type: "string", description: "YYYY-MM-DD" },
          limit: { type: "number", description: "結果件数の上限。既定10" },
        },
      },
    },
  },
];

// ===========================================================
// Executor
// ===========================================================

interface ReadToolContext {
  tenantId: string;
}

export async function executeReadTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ReadToolContext,
): Promise<unknown> {
  const str = (k: string): string | undefined => {
    const v = args[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const num = (k: string): number | undefined => {
    const v = args[k];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
  };
  const arr = (k: string): string[] | undefined => {
    const v = args[k];
    if (!Array.isArray(v)) return undefined;
    const cleaned = v.filter((x): x is string => typeof x === "string");
    return cleaned.length > 0 ? cleaned : undefined;
  };
  const bool = (k: string): boolean | undefined => {
    const v = args[k];
    return typeof v === "boolean" ? v : undefined;
  };

  switch (toolName) {
    case "search_conversations":
      return searchConversationsForChat(ctx.tenantId, {
        query: str("query"),
        personName: str("person_name"),
        dateFrom: str("date_from"),
        dateTo: str("date_to"),
        channels: arr("channels"),
        importance: arr("importance"),
        limit: num("limit"),
      });
    case "search_tasks":
      return searchTasksForChat(ctx.tenantId, {
        query: str("query"),
        statuses: arr("statuses"),
        priorities: arr("priorities"),
        dueOnOrBefore: str("due_on_or_before"),
        overdueOnly: bool("overdue_only"),
        limit: num("limit"),
      });
    case "search_people":
      return searchPeopleForChat(ctx.tenantId, {
        query: str("query"),
        importance: arr("importance"),
        temperature: arr("temperature"),
        metContext: arr("met_context"),
        referrerName: str("referrer_name"),
        hasAction: bool("has_action"),
        limit: num("limit"),
      });
    case "search_decision_cases":
      return searchDecisionCasesForChat(ctx.tenantId, {
        query: str("query"),
        confirmedOnly: bool("confirmed_only") ?? true,
        dateFrom: str("date_from"),
        dateTo: str("date_to"),
        limit: num("limit"),
      });
    default:
      return { error: `未知の read tool: ${toolName}` };
  }
}
