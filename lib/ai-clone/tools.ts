// AI Clone の Tool Calling 基盤。
//
// 目的:
//   Slack/LINE/Web チャットから自然文で「人物の関心ごとに○○追加」「△△の紹介元は□□」
//   「○○やる」「○○終わった」みたいな書込み系を発火させるための OpenAI function-calling
//   ベースの dispatcher。
//
// 設計:
//   * intent classifier で intent="mutate" になったメッセージは handleMutate に来る。
//   * handleMutate は OpenAI に tools 一覧 + ユーザー文を渡し、AI が必要な tool を選んで
//     引数を組み立てる → 戻ってきた tool_calls をローカルで execute する。
//   * 人物名は executor 側で resolvePerson（曖昧時は中断して警告を返す）。
//   * Slack/LINE と /clone Web UI から共通で呼べるよう、副作用は supabase-db.ts に
//     ある関数だけを使う（HTTP / Next.js Server Action 経由には依存しない）。

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import {
  resolvePerson,
  updatePersonFull,
  createOrUpdateTaskByName,
  searchTasksByName,
  updateTaskStatus,
  updateTaskDueDate,
  deleteTask,
  searchPeopleByName,
  createConversationLog,
  createDecisionCase,
  createReferralActivity,
  savePendingAction,
} from "./supabase-db";
import { withWeekday, resolveRelativeWeekday, todayJST } from "./date-utils";

export type ChatChannel = "Slack" | "LINE" | "Web";

// ===========================================================
// Tool 定義（OpenAI function spec）
// ===========================================================

export const aiCloneTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "update_person",
      description:
        "人物の属性を部分更新する。紹介元・出会った場所・重要度・関心ごと・備考・次のアクションなど。" +
        "対象人物が DB になければ自動で新規作成する。紹介元の人物も自動作成して FK で紐付ける。" +
        "interests は追加（既存と union）。会社名/役職/出会った場所などはテキスト上書き。",
      parameters: {
        type: "object",
        properties: {
          person_name: {
            type: "string",
            description: "更新対象の人物名（さん/氏/様は外す）",
          },
          company_name: { type: "string", description: "会社名（上書き）" },
          position: { type: "string", description: "役職（上書き）" },
          met_context: {
            type: "string",
            description: "出会った場所・コミュニティ（例: ○○セミナー / △△サロン / 紹介経由）",
          },
          importance: {
            type: "string",
            enum: ["S", "A", "B", "C"],
            description: "重要度",
          },
          trust_level: { type: "string", description: "信頼度（フリーテキスト）" },
          temperature: {
            type: "string",
            enum: ["熱い", "様子見", "冷えてる"],
            description: "温度感",
          },
          referrer_name: {
            type: "string",
            description:
              "紹介元の人物名。テナント内に該当者がいれば FK 紐付け、いなければ自動作成。",
          },
          add_interests: {
            type: "array",
            items: { type: "string" },
            description: "関心ごとに追加するタグ（既存と union）",
          },
          caveats: { type: "string", description: "備考（旧: 課題＋注意点を統合、上書き）" },
          next_action: { type: "string", description: "次のアクション（上書き）" },
        },
        required: ["person_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "新しいタスクを作成する。「○○やる」「○○タスク追加」「○○の準備しないと」など。" +
        "期限・優先度・関係人物が文面から読めれば設定する。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "タスク名（短く具体的に）" },
          due_date: {
            type: "string",
            description: "期限。YYYY-MM-DD 形式。相対表現は今日基準で絶対化",
          },
          priority: {
            type: "string",
            enum: ["高", "中", "低"],
            description: "優先度",
          },
          purpose: { type: "string", description: "タスクの目的・背景（任意）" },
          related_person_names: {
            type: "array",
            items: { type: "string" },
            description: "関係人物の名前一覧（さん/氏抜き）",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description:
        "既存タスクを完了状態にする。「○○終わった」「○○やった」「○○完了」など。" +
        "task_query にタスク名の一部を入れると部分一致検索する。",
      parameters: {
        type: "object",
        properties: {
          task_query: {
            type: "string",
            description: "完了させるタスク名の一部（部分一致検索する）",
          },
        },
        required: ["task_query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_task",
      description:
        "既存タスクの期限を変更する（リスケ）。「○○を金曜まで」「△△を来週に」「□□リスケ」など。" +
        "task_query にタスク名の一部、new_due_date に新しい期限を入れる。",
      parameters: {
        type: "object",
        properties: {
          task_query: {
            type: "string",
            description: "期限変更するタスク名の一部（部分一致検索する）",
          },
          new_due_date: {
            type: "string",
            description: "新しい期限。YYYY-MM-DD 形式。相対表現は今日基準で絶対化",
          },
        },
        required: ["task_query", "new_due_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_task",
      description:
        "既存タスクをやめる（削除する）。「○○やめる」「△△はもういい」「□□キャンセル」「やらない」など。" +
        "task_query にタスク名の一部を入れると部分一致検索する。",
      parameters: {
        type: "object",
        properties: {
          task_query: {
            type: "string",
            description: "やめる（削除する）タスク名の一部（部分一致検索する）",
          },
        },
        required: ["task_query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_conversation",
      description:
        "会話・打ち合わせ・電話・面談・会食などの記録を「会話ログ」として保存する。" +
        "「○○さんと話した」「○○さんと打合せ」「○○さんと電話した」「○○さんとランチ」「○○さんと△△の件で相談」など、" +
        "誰と何の話をしたかが書かれている自然文に対して発火する。" +
        "1メッセージに複数人が登場すれば全員を person_names に入れる（複数人OK）。" +
        "ファネル更新（提案/参加/商談/受注）や人物属性更新（紹介元/関心/温度感など）が同時に含まれる場合は、" +
        "そちらは別ツール（update_person 等）で扱い、この log_conversation は会話の事実記録に専念する。",
      parameters: {
        type: "object",
        properties: {
          person_names: {
            type: "array",
            items: { type: "string" },
            description: "登場人物の名前一覧（さん/氏/様は外す）。1人以上必須。",
          },
          summary: {
            type: "string",
            description:
              "会話の短い見出し（10〜30文字目安）。例：「打合せ：旅費規定」「電話：来週の見積」「ランチ：紹介の話」",
          },
          content: {
            type: "string",
            description: "会話の中身。ユーザーメッセージをほぼそのまま入れてよい。",
          },
          channel: {
            type: "string",
            enum: ["Slack", "LINE", "Email", "対面", "電話", "その他"],
            description: "チャネル（文面から読み取れなければ「対面」）",
          },
          next_action: {
            type: "string",
            description: "次の打ち手・次回約束など。なければ省略。",
          },
          importance: {
            type: "string",
            enum: ["S", "A", "B", "C"],
            description: "重要度（任意）",
          },
        },
        required: ["person_names", "summary", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_decision_case",
      description:
        "経営者本人の「判断事例ログ」を保存する。" +
        "誰かと話した記録（log_conversation）ではなく、" +
        "本人の判断・意思決定・対応・学び・反省・原則化が書かれている自然文に対して発火する。" +
        "発火例：" +
        "「今日◯◯さんから相談あって、不安そうだったからまず安心させた。前向きになった」/" +
        "「△△の判断、本当は××が本質だと思ったから□□と伝えた」/" +
        "「学びとして、不安が強い人にはまず安心を渡す方が早い、と分かった」/" +
        "「今日◯◯について、こう判断した。理由は…、結果は…」など。" +
        "" +
        "重要：" +
        "  * 保存される事例は ai_drafted=true / confirmed=false 状態。" +
        "    ユーザーは後で Web (/clone/<slug>/core-os/decision-principles?view=case)" +
        "    で内容確認 → 「確認する」ボタンで正本化する設計。" +
        "  * 自然文から読み取れない項目は無理に埋めず省略する（null）。" +
        "  * event は必須。残りは抽出できたものだけ。" +
        "  * 「感情」は本人が明示的に書いた場合だけ抽出（AI が推測しない）。" +
        "" +
        "log_conversation と発火条件が紛らわしい場合の判別：" +
        "  * 「誰と何を話した」が中心 → log_conversation" +
        "  * 「本人がどう判断した／何を学んだ」が中心 → log_decision_case" +
        "  * 両方含む場合は基本 log_conversation を優先。本人の判断・学びが" +
        "    明示的に書かれていれば log_decision_case を同時発火してよい。",
      parameters: {
        type: "object",
        properties: {
          event: {
            type: "string",
            description:
              "何があったか（必須）。短く事実ベース。本人視点で書く。" +
              "例：「クライアントAから契約破棄したいと連絡あった」",
          },
          insight: {
            type: "string",
            description:
              "本当は何が問題だと本人が思ったか（本質的な見立て）。" +
              "本人が明示的に書いていなければ省略。",
          },
          action: {
            type: "string",
            description: "実際に何と言った／何をしたか。",
          },
          outcome: {
            type: "string",
            description: "相手や状況がどう変わったか。",
          },
          takeaway: {
            type: "string",
            description:
              "一言での学び・教訓。原則化候補。本人が「〜と分かった」「〜が大事」等と書いていれば抽出。",
          },
          intent: {
            type: "string",
            description: "なぜその対応にしたか（判断意図）。明示があれば抽出。",
          },
          boundary: {
            type: "string",
            description:
              "どこまで対応すべきと思ったかの線引き（専門家・有料・本人課題など）。明示があれば抽出。",
          },
          reflection: {
            type: "string",
            description: "今なら何を変えるか（反省）。明示があれば抽出。",
          },
          reusable_when: {
            type: "string",
            description: "どんな人・状況なら使えるかの汎化条件。明示があれば抽出。",
          },
          emotion: {
            type: "string",
            description:
              "本人がその時感じた感情（参考情報）。" +
              "本人が明示的に書いた場合のみ抽出。推測しない。",
          },
        },
        required: ["event"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_referral",
      description:
        "紹介に関する『行動』を記録する。紹介コーチの考え方（紹介＝頼んだ数×与えた数）を測るための母数になる。2種類：" +
        "(1) kind='asked' = 自分が誰かに“紹介を頼んだ/依頼した/お願いした”とき。person_names に頼んだ相手。" +
        "(2) kind='gave' = 自分が誰かを誰かに“紹介した/繋いだ/引き合わせた”とき。person_names に関係者全員（紹介した人・された相手）。" +
        "発火例：「○○さんに紹介頼んだ」「○○さんに紹介お願いした」→asked。" +
        "「○○さんを△△さんに紹介した」「○○と△△を繋いだ」→gave。" +
        "単に会話・打合せした記録は log_conversation を使う。これは“紹介を頼んだ／与えた”という紹介行動専用。",
      parameters: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["asked", "gave"],
            description: "asked=紹介を頼んだ / gave=紹介を与えた（自分が紹介した）",
          },
          person_names: {
            type: "array",
            items: { type: "string" },
            description:
              "関係人物の名前（さん/氏/様は外す）。1人以上必須。" +
              "asked は頼んだ相手、gave は紹介した人と相手の両方を入れる。",
          },
          note: {
            type: "string",
            description: "補足（何の紹介か等）。任意。",
          },
        },
        required: ["kind", "person_names"],
      },
    },
  },
];

// ===========================================================
// Executor: tool_calls を実行して個別レポートを返す
// ===========================================================

export interface ToolExecutionReport {
  toolName: string;
  ok: boolean;
  summary: string; // 人間向け要約（後で Slack に統合表示する）
}

interface ExecuteContext {
  tenantId: string;
  // Slack/LINE 経由で来た時のみ埋まる。曖昧マッチ確認の往復 pending を作るのに使う。
  externalUserId?: string;
  channel?: ChatChannel;
  // 元のユーザー発言。create_task の曜日表現（「今週の金曜」等）をコードで補正するのに使う。
  userText?: string;
}

// OpenAI から戻ってきた 1 tool_call を実行する。
async function executeOne(
  toolName: string,
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  switch (toolName) {
    case "update_person":
      return executeUpdatePerson(args, ctx);
    case "create_task":
      return executeCreateTask(args, ctx);
    case "complete_task":
      return executeCompleteTask(args, ctx);
    case "reschedule_task":
      return executeRescheduleTask(args, ctx);
    case "cancel_task":
      return executeCancelTask(args, ctx);
    case "log_conversation":
      return executeLogConversation(args, ctx);
    case "log_decision_case":
      return executeLogDecisionCase(args, ctx);
    case "log_referral":
      return executeLogReferral(args, ctx);
    default:
      return {
        toolName,
        ok: false,
        summary: `未知のツール: ${toolName}`,
      };
  }
}

async function executeUpdatePerson(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const name = typeof args.person_name === "string" ? args.person_name.trim() : "";
  if (!name) {
    return { toolName: "update_person", ok: false, summary: "person_name 未指定" };
  }

  // 対象人物を解決
  const target = await resolvePerson(ctx.tenantId, name);
  if (!target) {
    return {
      toolName: "update_person",
      ok: false,
      summary: `「${name}」を解決できませんでした`,
    };
  }
  if (target.state === "ambiguous") {
    return {
      toolName: "update_person",
      ok: false,
      summary: `「${name}」が同名複数人。フルネームで再送してください（候補: ${target.candidates
        .slice(0, 3)
        .map((c) => `${c.name}${c.companyHint ? `(${c.companyHint})` : ""}`)
        .join(" / ")}）`,
    };
  }

  // 紹介元 → 自動作成 or FK 解決
  let referredByPersonId: string | null | undefined;
  let referrerName: string | undefined; // 既存 Web UI が referred_by(text) を表示しているため、text にもミラー書込みする
  let referrerSummary = "";
  let referrerCreated = false;
  if (typeof args.referrer_name === "string" && args.referrer_name.trim()) {
    const inputName = args.referrer_name.trim();
    // 自分自身を紹介元にしないガード
    if (inputName.toLowerCase() === target.name.toLowerCase()) {
      return {
        toolName: "update_person",
        ok: false,
        summary: `「${target.name}」を自分自身の紹介元にはできません`,
      };
    }
    const referrer = await resolvePerson(ctx.tenantId, inputName);
    if (!referrer) {
      return {
        toolName: "update_person",
        ok: false,
        summary: `紹介元「${inputName}」を解決できませんでした`,
      };
    }
    if (referrer.state === "ambiguous") {
      return {
        toolName: "update_person",
        ok: false,
        summary: `紹介元「${inputName}」が同名複数人。フルネームで再送してください`,
      };
    }
    referredByPersonId = referrer.id;
    referrerName = referrer.name;
    referrerCreated = referrer.created;
    referrerSummary = `紹介元=${referrer.name}${referrer.created ? "(新規作成)" : ""}`;
  }

  const updateParams: Parameters<typeof updatePersonFull>[2] = {};
  if (typeof args.company_name === "string") updateParams.companyName = args.company_name;
  if (typeof args.position === "string") updateParams.position = args.position;
  if (typeof args.met_context === "string") updateParams.metContext = args.met_context;
  if (typeof args.importance === "string") updateParams.importance = args.importance;
  if (typeof args.trust_level === "string") updateParams.trustLevel = args.trust_level;
  if (typeof args.temperature === "string") updateParams.temperature = args.temperature;
  if (typeof args.caveats === "string") updateParams.caveats = args.caveats;
  if (typeof args.next_action === "string") updateParams.nextAction = args.next_action;
  if (Array.isArray(args.add_interests)) {
    updateParams.addInterests = (args.add_interests as unknown[]).filter(
      (v): v is string => typeof v === "string" && v.trim().length > 0,
    );
  }
  if (referredByPersonId !== undefined) {
    updateParams.referredByPersonId = referredByPersonId;
    // 既存 Web UI（/clone/[slug]/people/[id]）が referred_by(text) を表示するため、
    // 同期して text 列にも書き込む（FK 削除時は text も空に）
    updateParams.referredByText = referrerName ?? null;
  }

  // 何も更新項目がない場合は何もしない
  if (Object.keys(updateParams).length === 0) {
    return {
      toolName: "update_person",
      ok: true,
      summary: `${target.name}: 変更項目なし`,
    };
  }

  const res = await updatePersonFull(ctx.tenantId, target.id, updateParams);
  if (!res.ok) {
    return {
      toolName: "update_person",
      ok: false,
      summary: `${target.name} 更新失敗: ${res.error || "原因不明"}`,
    };
  }

  const changes: string[] = [];
  if (referrerSummary) changes.push(referrerSummary);
  if (updateParams.addInterests?.length) {
    changes.push(`関心+${updateParams.addInterests.join("/")}`);
  }
  if (updateParams.metContext) changes.push(`出会った場所=${updateParams.metContext}`);
  if (updateParams.importance) changes.push(`重要度=${updateParams.importance}`);
  if (updateParams.temperature) changes.push(`温度感=${updateParams.temperature}`);
  if (updateParams.trustLevel) changes.push(`信頼度=${updateParams.trustLevel}`);
  if (updateParams.companyName) changes.push(`会社=${updateParams.companyName}`);
  if (updateParams.position) changes.push(`役職=${updateParams.position}`);
  if (updateParams.caveats) changes.push(`備考更新`);
  if (updateParams.nextAction) changes.push(`次のアクション更新`);

  const headBits: string[] = [target.name];
  if (target.created) headBits.push("(新規作成)");
  if (referrerCreated) {
    // 紹介元の新規作成は changes 内に既出
  }

  return {
    toolName: "update_person",
    ok: true,
    summary: `${headBits.join("")} ${changes.length > 0 ? changes.join(" / ") : "更新"}`,
  };
}

async function executeCreateTask(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const name = typeof args.name === "string" ? args.name.trim() : "";
  if (!name) {
    return { toolName: "create_task", ok: false, summary: "タスク名が空" };
  }

  // 関係人物の解決（解決失敗は無視、リンクなしで作成）
  const peopleNames = Array.isArray(args.related_person_names)
    ? (args.related_person_names as unknown[]).filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      )
    : [];
  const personIds: string[] = [];
  const newlyCreated: string[] = [];
  const ambiguous: string[] = [];
  for (const n of peopleNames) {
    const r = await resolvePerson(ctx.tenantId, n);
    if (!r) continue;
    if (r.state === "ambiguous") {
      ambiguous.push(n);
      continue;
    }
    personIds.push(r.id);
    if (r.created) newlyCreated.push(r.name);
  }
  if (ambiguous.length > 0) {
    return {
      toolName: "create_task",
      ok: false,
      summary: `関係人物「${ambiguous.join("/")}」が同名複数人。フルネームで再送してください`,
    };
  }

  // 曜日表現（「今週の金曜」「金曜まで」等）は元発言からコードで確定し、
  // LLM の曜日誤計算（金曜6/12 を 6/10 と誤る等）を上書きする。
  const llmDue = typeof args.due_date === "string" ? args.due_date : undefined;
  const codeWeekdayDate = ctx.userText
    ? resolveRelativeWeekday(ctx.userText, todayJST())
    : null;
  const dueDate = codeWeekdayDate ?? llmDue;

  const saved = await createOrUpdateTaskByName(ctx.tenantId, {
    name,
    dueDate,
    priority: typeof args.priority === "string" ? args.priority : undefined,
    purpose: typeof args.purpose === "string" ? args.purpose : undefined,
    peopleIds: personIds,
  });
  if (!saved) {
    return { toolName: "create_task", ok: false, summary: "タスク作成失敗" };
  }

  const tail: string[] = [];
  if (dueDate) tail.push(`期限:${dueDate}`);
  if (args.priority) tail.push(`優先度:${args.priority}`);
  if (personIds.length > 0) tail.push(`関係者:${personIds.length}人`);
  if (newlyCreated.length > 0) tail.push(`新規人物:${newlyCreated.join("/")}`);

  // 同名の未完タスクがあれば更新（作り直さない）。確認往復での重複を防ぐ。
  const verb = saved.updated ? "更新" : "追加";
  return {
    toolName: "create_task",
    ok: true,
    summary: `タスク${verb}「${name}」${tail.length > 0 ? ` (${tail.join(", ")})` : ""}`,
  };
}

async function executeCompleteTask(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const query =
    typeof args.task_query === "string" ? args.task_query.trim() : "";
  if (!query) {
    return { toolName: "complete_task", ok: false, summary: "task_query 未指定" };
  }

  const matches = await searchTasksByName(ctx.tenantId, query, 5);
  const open = matches.filter((t) => t.status !== "完了");

  if (open.length === 0) {
    if (matches.length > 0) {
      return {
        toolName: "complete_task",
        ok: false,
        summary: `「${query}」に一致するタスクは既に完了済みでした`,
      };
    }
    return {
      toolName: "complete_task",
      ok: false,
      summary: `「${query}」に一致するタスクが見つかりません`,
    };
  }
  if (open.length > 1) {
    return {
      toolName: "complete_task",
      ok: false,
      summary: `「${query}」に一致するタスクが${open.length}件。もう少し具体的に書いてください (候補: ${open
        .slice(0, 3)
        .map((t) => `「${t.name}」`)
        .join(" / ")})`,
    };
  }

  const target = open[0];
  const ok = await updateTaskStatus(ctx.tenantId, target.id, "完了");
  if (!ok) {
    return { toolName: "complete_task", ok: false, summary: "タスク完了化失敗" };
  }
  return {
    toolName: "complete_task",
    ok: true,
    summary: `タスク完了「${target.name}」`,
  };
}

// タスクの期限を変更する（リスケ）。曜日表現は元発言からコードで確定。
async function executeRescheduleTask(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const query =
    typeof args.task_query === "string" ? args.task_query.trim() : "";
  if (!query) {
    return { toolName: "reschedule_task", ok: false, summary: "task_query 未指定" };
  }
  // 新しい期限：曜日表現（「金曜まで」等）は元発言からコード確定、無ければ LLM 引数。
  const codeDate = ctx.userText
    ? resolveRelativeWeekday(ctx.userText, todayJST())
    : null;
  const newDue =
    codeDate ?? (typeof args.new_due_date === "string" ? args.new_due_date : "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDue)) {
    return {
      toolName: "reschedule_task",
      ok: false,
      summary: "新しい期限が読み取れません（例：金曜まで / 6/20）",
    };
  }

  const matches = await searchTasksByName(ctx.tenantId, query, 5);
  const open = matches.filter((t) => t.status !== "完了");
  if (open.length === 0) {
    return {
      toolName: "reschedule_task",
      ok: false,
      summary: `「${query}」に一致する未完了タスクが見つかりません`,
    };
  }
  if (open.length > 1) {
    return {
      toolName: "reschedule_task",
      ok: false,
      summary: `「${query}」に一致するタスクが${open.length}件。もう少し具体的に書いてください (候補: ${open
        .slice(0, 3)
        .map((t) => `「${t.name}」`)
        .join(" / ")})`,
    };
  }
  const target = open[0];
  const ok = await updateTaskDueDate(ctx.tenantId, target.id, newDue);
  if (!ok) {
    return { toolName: "reschedule_task", ok: false, summary: "期限変更失敗" };
  }
  return {
    toolName: "reschedule_task",
    ok: true,
    summary: `期限変更「${target.name}」→ ${newDue}`,
  };
}

// タスクをやめる（削除する）。「○○やめる」等から。誤爆防止に1件特定、複数は確認を返す。
async function executeCancelTask(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const query =
    typeof args.task_query === "string" ? args.task_query.trim() : "";
  if (!query) {
    return { toolName: "cancel_task", ok: false, summary: "task_query 未指定" };
  }
  const matches = await searchTasksByName(ctx.tenantId, query, 5);
  const open = matches.filter((t) => t.status !== "完了");
  if (open.length === 0) {
    return {
      toolName: "cancel_task",
      ok: false,
      summary: `「${query}」に一致する未完了タスクが見つかりません`,
    };
  }
  if (open.length > 1) {
    return {
      toolName: "cancel_task",
      ok: false,
      summary: `「${query}」に一致するタスクが${open.length}件。もう少し具体的に書いてください (候補: ${open
        .slice(0, 3)
        .map((t) => `「${t.name}」`)
        .join(" / ")})`,
    };
  }
  const target = open[0];
  const ok = await deleteTask(ctx.tenantId, target.id);
  if (!ok) {
    return { toolName: "cancel_task", ok: false, summary: "タスク削除失敗" };
  }
  return {
    toolName: "cancel_task",
    ok: true,
    summary: `タスクをやめました（削除）「${target.name}」`,
  };
}

// 会話ログ記録（複数人OK）。
// 人物名は resolvePerson で解決し、ヒット時はその場で conversation_log + person_conversation_logs を作る。
// 曖昧（同名複数）があれば全件まとめて返し、ユーザーに再送を促す。Phase C で
// pending_action テーブルに切り替えて、bot が「1) 田中太郎 2) 田中一郎」式の往復確認を行う。
async function executeLogConversation(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const names = Array.isArray(args.person_names)
    ? (args.person_names as unknown[]).filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      )
    : [];
  if (names.length === 0) {
    return {
      toolName: "log_conversation",
      ok: false,
      summary: "person_names が空（誰との会話か特定できませんでした）",
    };
  }
  const summary = typeof args.summary === "string" ? args.summary.trim() : "";
  const content = typeof args.content === "string" ? args.content.trim() : "";
  if (!summary || !content) {
    return {
      toolName: "log_conversation",
      ok: false,
      summary: "summary と content は必須",
    };
  }

  // 人物解決を一括。曖昧があれば全件返して再送を促す（Phase C で往復確認に置換予定）。
  const personIds: string[] = [];
  const newlyCreated: string[] = [];
  const resolvedNames: string[] = [];
  const ambiguous: { name: string; candidates: string[] }[] = [];
  for (const n of names) {
    const r = await resolvePerson(ctx.tenantId, n);
    if (!r) continue;
    if (r.state === "ambiguous") {
      ambiguous.push({
        name: n,
        candidates: r.candidates
          .slice(0, 4)
          .map((c) => `${c.name}${c.companyHint ? `(${c.companyHint})` : ""}`),
      });
      continue;
    }
    personIds.push(r.id);
    resolvedNames.push(r.name);
    if (r.created) newlyCreated.push(r.name);
  }

  if (ambiguous.length > 0) {
    // 曖昧が1件かつ Slack/LINE 経路（externalUserId/channel あり）の場合は pending を保存して
    // 番号確認の往復に入る。複数曖昧 or Web チャネルの場合は従来通りエラーで返す。
    if (ambiguous.length === 1 && ctx.externalUserId && ctx.channel) {
      const amb = ambiguous[0];
      // 候補の実体は resolvePerson 内で得ているが、現状の戻り型では候補配列を保持していないので
      // ここでは searchPeopleByName を再呼びして候補一覧を取得する（数件なのでコスト無視）。
      const candidateRows = await searchPeopleByName(ctx.tenantId, amb.name);
      const candidates = candidateRows.slice(0, 5).map((c) => ({
        id: c.id,
        name: c.name,
        companyHint: c.companyHint || "",
      }));

      const saved = await savePendingAction({
        tenantId: ctx.tenantId,
        channel: ctx.channel,
        externalUserId: ctx.externalUserId,
        actionKind: "log_conversation_disambiguate",
        payload: {
          toolArgs: args,
          resolvedPersonIds: personIds,
          resolvedNames,
          newlyCreated,
          ambiguousName: amb.name,
          candidates,
        },
      });

      if (saved) {
        const list = candidates
          .map(
            (c, i) =>
              `${i + 1}) ${c.name}${c.companyHint ? `（${c.companyHint}）` : ""}`,
          )
          .join("\n");
        return {
          toolName: "log_conversation",
          ok: false, // 確定保存はまだ。あえて ok:false にして mutate レポートに「⚠️」を出さない方が綺麗だが、
          // 今は handleMutate がレポートをそのまま並べる仕様なので、summary に番号案内を含めて返す。
          summary: `「${amb.name}」の候補が複数あります。番号で返信してください：\n${list}\n\nやめる場合は「キャンセル」と返信してください。`,
        };
      }
    }

    const lines = ambiguous.map(
      (a) => `「${a.name}」が同名複数人。候補: ${a.candidates.join(" / ")}`,
    );
    return {
      toolName: "log_conversation",
      ok: false,
      summary: `${lines.join(" / ")} → フルネームで再送してください`,
    };
  }

  if (personIds.length === 0) {
    return {
      toolName: "log_conversation",
      ok: false,
      summary: "人物が1人も解決できませんでした",
    };
  }

  const channel = typeof args.channel === "string" ? args.channel : "対面";
  const created = await createConversationLog(ctx.tenantId, {
    summary,
    content,
    channel,
    nextAction:
      typeof args.next_action === "string" && args.next_action.trim()
        ? args.next_action.trim()
        : undefined,
    importance:
      typeof args.importance === "string"
        ? (args.importance as "S" | "A" | "B" | "C")
        : undefined,
    personIds,
  });
  if (!created) {
    return {
      toolName: "log_conversation",
      ok: false,
      summary: "会話ログ作成失敗",
    };
  }

  const tail: string[] = [];
  if (newlyCreated.length > 0) tail.push(`新規人物:${newlyCreated.join("/")}`);
  if (args.next_action) tail.push("次の打ち手あり");

  return {
    toolName: "log_conversation",
    ok: true,
    summary: `会話ログ記録「${summary}」 関係者:${resolvedNames.join("/")}${
      tail.length > 0 ? ` (${tail.join(", ")})` : ""
    }`,
  };
}

// ===========================================================
// 判断事例ログ（Slack/LINE 自然文 → AI 抽出 → confirmed=false で保存）
// 保存後はユーザーが Web /clone/<slug>/core-os/decision-principles?view=case
// で内容確認 → 「確認する」ボタンで confirmed=true に昇格させる設計。
// AI が誤抽出してもユーザー確認なしには「正本」にならない安全弁。
// ===========================================================

async function executeLogDecisionCase(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const event = typeof args.event === "string" ? args.event.trim() : "";
  if (!event) {
    return {
      toolName: "log_decision_case",
      ok: false,
      summary: "event 未指定（何があったかが特定できませんでした）",
    };
  }

  const pick = (k: string): string | undefined => {
    const v = args[k];
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  };

  // 何かしらロング項目が入っていれば capture_mode=long、それ以外は short
  const longFields = ["intent", "boundary", "reflection", "reusable_when", "emotion"];
  const hasLong = longFields.some((k) => pick(k) !== undefined);

  const created = await createDecisionCase(ctx.tenantId, {
    event,
    insight: pick("insight"),
    action: pick("action"),
    outcome: pick("outcome"),
    takeaway: pick("takeaway"),
    intent: pick("intent"),
    boundary: pick("boundary"),
    reflection: pick("reflection"),
    reusable_when: pick("reusable_when"),
    emotion: pick("emotion"),
    captureMode: hasLong ? "long" : "short",
  });

  if (!created) {
    return {
      toolName: "log_decision_case",
      ok: false,
      summary: "判断事例の保存に失敗しました",
    };
  }

  const takeaway = pick("takeaway");
  const headline = takeaway ?? event.slice(0, 40);
  return {
    toolName: "log_decision_case",
    ok: true,
    summary: `判断事例を仮登録「${headline}」（Web で内容確認＋「確認する」を押してください）`,
  };
}

// ===========================================================
// 紹介行動ログ（紹介を頼んだ / 与えた）。紹介KPIの母数になる。
// 既存 activity_log に activity_type='紹介依頼'|'紹介実施' で残す。
// ===========================================================

async function executeLogReferral(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const kind =
    args.kind === "gave" ? "gave" : args.kind === "asked" ? "asked" : null;
  if (!kind) {
    return {
      toolName: "log_referral",
      ok: false,
      summary: "kind は asked（頼んだ）か gave（与えた）を指定してください",
    };
  }

  const names = Array.isArray(args.person_names)
    ? (args.person_names as unknown[]).filter(
        (v): v is string => typeof v === "string" && v.trim().length > 0,
      )
    : [];
  if (names.length === 0) {
    return {
      toolName: "log_referral",
      ok: false,
      summary: "person_names が空（誰との紹介か特定できませんでした）",
    };
  }
  const note = typeof args.note === "string" ? args.note.trim() : "";

  const personIds: string[] = [];
  const resolvedNames: string[] = [];
  const newlyCreated: string[] = [];
  const ambiguous: string[] = [];
  for (const n of names) {
    const r = await resolvePerson(ctx.tenantId, n);
    if (!r) continue;
    if (r.state === "ambiguous") {
      ambiguous.push(n);
      continue;
    }
    personIds.push(r.id);
    resolvedNames.push(r.name);
    if (r.created) newlyCreated.push(r.name);
  }

  if (ambiguous.length > 0) {
    return {
      toolName: "log_referral",
      ok: false,
      summary: `「${ambiguous.join("/")}」が同名複数人。フルネームで再送してください`,
    };
  }
  if (personIds.length === 0) {
    return {
      toolName: "log_referral",
      ok: false,
      summary: "人物が1人も解決できませんでした",
    };
  }

  const label = kind === "asked" ? "紹介依頼" : "紹介実施";
  const verb = kind === "asked" ? "に紹介を依頼" : "を紹介";
  const content = `${label}: ${resolvedNames.join(" / ")}${verb}${
    note ? `（${note}）` : ""
  }`;

  const created = await createReferralActivity(ctx.tenantId, {
    kind,
    content,
    peopleIds: personIds,
  });
  if (!created) {
    return {
      toolName: "log_referral",
      ok: false,
      summary: "紹介の記録に失敗しました",
    };
  }

  const tail: string[] = [];
  if (newlyCreated.length > 0) tail.push(`新規人物:${newlyCreated.join("/")}`);
  const head = kind === "asked" ? "紹介を頼んだ記録" : "紹介した記録";
  return {
    toolName: "log_referral",
    ok: true,
    summary: `${head}「${resolvedNames.join("/")}」${
      tail.length > 0 ? ` (${tail.join(", ")})` : ""
    }`,
  };
}

// ===========================================================
// dispatcher: 1 メッセージ → tool_calls 実行 → レポート集約
// ===========================================================

export async function dispatchMutateTools(
  client: OpenAI,
  tenantId: string,
  userMessage: string,
  callerCtx?: { externalUserId?: string; channel?: ChatChannel },
): Promise<{ executed: boolean; reports: ToolExecutionReport[]; aiNote?: string }> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        `今日は ${withWeekday(todayJST())}（JST）です。期限の相対表現（「明日」「来週」「今週の金曜」等）はこの日付と曜日を基準に YYYY-MM-DD へ絶対化してください。` +
        "あなたは経営者の AI Clone のデータ書込みアシスタントです。" +
        "ユーザーのメッセージから、必要なツールを 1 つまたは複数選び、引数を組み立てて呼び出してください。" +
        "確実にデータ更新の意図があるときだけツールを呼んでください（質問・雑談・確認はツールを呼ばない）。" +
        "「○○さんに紹介を頼んだ／依頼した」「○○さんを△△さんに紹介した／繋いだ」は log_referral を使う（単なる会話記録の log_conversation と混同しない）。" +
        "1 メッセージに複数の更新が含まれていれば、複数の tool_call を並行で発火してください。",
    },
    { role: "user", content: userMessage },
  ];

  let response;
  try {
    response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: aiCloneTools,
      tool_choice: "auto",
      max_tokens: 800,
    });
  } catch (err) {
    console.error("[ai-clone] tool calling 呼び出し失敗:", err);
    return { executed: false, reports: [] };
  }

  const choice = response.choices[0];
  const toolCalls = choice?.message?.tool_calls || [];
  const aiNote = choice?.message?.content?.trim() || undefined;

  if (toolCalls.length === 0) {
    return { executed: false, reports: [], aiNote };
  }

  const reports: ToolExecutionReport[] = [];
  for (const call of toolCalls) {
    if (call.type !== "function") continue;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch {
      reports.push({
        toolName: call.function.name,
        ok: false,
        summary: `引数 JSON のパース失敗: ${call.function.arguments}`,
      });
      continue;
    }
    const rep = await executeOne(call.function.name, args, {
      tenantId,
      externalUserId: callerCtx?.externalUserId,
      channel: callerCtx?.channel,
      userText: userMessage,
    });
    reports.push(rep);
  }

  return { executed: true, reports, aiNote };
}

// 人物検索（ambiguous チェックの薄ラッパー、外部からも使えるよう露出）
export { searchPeopleByName };
