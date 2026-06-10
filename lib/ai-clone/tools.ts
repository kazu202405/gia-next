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
  updateTaskName,
  updateTaskPriority,
  updateTaskFields,
  deleteTask,
  restoreTask,
  getTaskById,
  recordUndo,
  readUndo,
  clearUndo,
  type UndoEntity,
  searchPeopleByName,
  createConversationLog,
  findRecentConversationLogs,
  getConversationLogSnapshot,
  updateConversationLogFields,
  setConversationLogPeople,
  deleteConversationLog,
  createDatedReminderRecord,
  findRecentDatedReminders,
  getDatedReminderSnapshot,
  updateDatedReminderFields,
  deleteDatedReminder,
  createDecisionCase,
  findRecentDecisionCases,
  getDecisionCaseSnapshot,
  updateDecisionCaseFields,
  deleteDecisionCase,
  createReferralActivity,
  findRecentReferralActivities,
  getReferralActivitySnapshot,
  updateReferralActivity,
  deleteReferralActivity,
  createProjectRecord,
  searchProjectsByName,
  updateProjectFields,
  PROJECT_STATUSES,
  createServiceRecord,
  searchServicesByName,
  updateServiceName,
  savePendingAction,
} from "./supabase-db";
import { withWeekday, resolveRelativeDate, todayJST } from "./date-utils";

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
      name: "reopen_task",
      description:
        "完了済みタスクを未完了（未着手）に戻す。「○○やっぱりまだ終わってない」「△△完了取り消して」「□□再開」「やっぱり戻して」など。" +
        "task_query にタスク名の一部を入れると部分一致検索する。",
      parameters: {
        type: "object",
        properties: {
          task_query: {
            type: "string",
            description: "未完了に戻すタスク名の一部（部分一致検索する）",
          },
        },
        required: ["task_query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_task_priority",
      description:
        "既存タスクの優先度を変更する。「○○優先度上げて／下げて」「△△を高く」「□□緊急で」「最優先」など。" +
        "task_query にタスク名の一部、priority に 高 / 中 / 低 のいずれかを入れる（緊急・最優先=高）。",
      parameters: {
        type: "object",
        properties: {
          task_query: {
            type: "string",
            description: "優先度を変えるタスク名の一部（部分一致検索する）",
          },
          priority: {
            type: "string",
            enum: ["高", "中", "低"],
            description: "新しい優先度。緊急・最優先は高、後回しは低。",
          },
        },
        required: ["task_query", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rename_task",
      description:
        "既存タスクの名前（内容）を修正する。「○○の件、△△に直して」「□□の名前を××に変えて」など。" +
        "task_query に現在のタスク名の一部、new_name に修正後のタスク名を入れる。",
      parameters: {
        type: "object",
        properties: {
          task_query: {
            type: "string",
            description: "修正対象タスクの現在名の一部（部分一致検索する）",
          },
          new_name: {
            type: "string",
            description: "修正後のタスク名",
          },
        },
        required: ["task_query", "new_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "restore_task",
      description:
        "削除（やめた）タスクを元に戻す（復元する）。「○○戻して」「△△復元して」「ゴミ箱から戻して」など。" +
        "task_query に戻したいタスク名の一部を入れると、削除済みの中から部分一致検索する。",
      parameters: {
        type: "object",
        properties: {
          task_query: {
            type: "string",
            description: "復元したい削除済みタスク名の一部（部分一致検索する）",
          },
        },
        required: ["task_query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "undo_last_action",
      description:
        "直前のタスク操作（完了・期限変更・削除・作成・優先度変更・名前変更）を取り消して元に戻す。" +
        "「さっきの取り消して」「間違えた」「今のなし」「元に戻して」など、対象を特定せず直近を戻したいとき。" +
        "特定のタスク名を挙げて戻すよう言われた場合は restore_task（削除の復元）や該当ツールを使う。",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_conversation_log",
      description:
        "既存の会話ログ（記録済みの打合せ・電話・会食など）を訂正する。" +
        "「さっきの会話、相手は△△さん」「あの記録の要約を□□に直して」「次のアクションを××に」など。" +
        "対象は match で特定（記録の内容の一部）。match 省略時は直近の会話ログを対象にする。" +
        "変えたい項目だけ渡す（people_names を渡すと関連人物を丸ごと置き換える）。",
      parameters: {
        type: "object",
        properties: {
          match: {
            type: "string",
            description: "対象の会話ログを特定するキーワード（要約の一部）。省略時は直近1件",
          },
          summary: { type: "string", description: "新しい要約（見出し）" },
          content: { type: "string", description: "新しい本文" },
          channel: { type: "string", description: "チャネル（対面/電話/Slack 等）" },
          next_action: { type: "string", description: "新しい次のアクション" },
          importance: {
            type: "string",
            enum: ["S", "A", "B", "C"],
            description: "重要度",
          },
          people_names: {
            type: "array",
            items: { type: "string" },
            description: "関連人物の置き換え（さん/様は外す）。指定すると既存の関連人物を丸ごと差し替える",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_conversation_log",
      description:
        "誤って記録した会話ログを削除する。「さっきの会話記録消して」「あの記録いらない・間違えた」など。" +
        "対象は match で特定（記録の内容の一部）。match 省略時は直近の会話ログを削除する。" +
        "削除後も「取り消して」で元に戻せる。",
      parameters: {
        type: "object",
        properties: {
          match: {
            type: "string",
            description: "削除対象の会話ログを特定するキーワード（要約の一部）。省略時は直近1件",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_reminder",
      description:
        "既存の日付リマインド（記念日・誕生日・周年・定例など）を変更する。" +
        "「○○の誕生日を3/30に直して」「△△の記念日のメモ変えて」「この毎月のやめて／もう通知しないで」（=停止）など。" +
        "match で対象を特定（リマインドのタイトルの一部）。new_date は YYYY-MM-DD。active=false で停止。",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "対象リマインドのタイトルの一部" },
          new_date: { type: "string", description: "新しい対象日 YYYY-MM-DD" },
          title: { type: "string", description: "新しいタイトル" },
          note: { type: "string", description: "新しいメモ" },
          recurrence: {
            type: "string",
            enum: ["none", "yearly", "monthly", "milestone"],
            description: "繰り返し種別",
          },
          active: {
            type: "boolean",
            description: "false で停止（もう通知しない）。true で再開。",
          },
        },
        required: ["match"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_reminder",
      description:
        "日付リマインドを削除する。「○○の記念日もういらない・消して」など。停止だけなら edit_reminder の active=false を使う。" +
        "match で対象を特定。削除後も「取り消して」で元に戻せる。",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "削除対象リマインドのタイトルの一部" },
        },
        required: ["match"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_referral_log",
      description:
        "既存の紹介ログ（紹介を頼んだ/与えたの記録）を訂正する。" +
        "「さっきの紹介、内容を□□に直して」「あれは頼んだじゃなく与えた（実施）」など。" +
        "match で対象を特定（記録内容の一部）。kind: asked=頼んだ / gave=与えた・実施。",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "対象の紹介ログを特定するキーワード。省略時は直近1件" },
          content: { type: "string", description: "新しい内容" },
          kind: {
            type: "string",
            enum: ["asked", "gave"],
            description: "asked=紹介を頼んだ / gave=紹介した（実施）",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_referral_log",
      description:
        "誤って記録した紹介ログを削除する。「やっぱり紹介してない」「さっきの紹介、二重に記録した・消して」など。" +
        "紹介KPI（頼んだ/与えた件数）の母数から外れる。match で対象特定。削除後「取り消して」で復元。",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "削除対象の紹介ログを特定するキーワード。省略時は直近1件" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_decision_case",
      description:
        "既存の判断事例（判断・対応・学びの記録）を訂正する。「さっきの判断事例の学びを□□に直して」「出来事を××に」など。" +
        "match で対象特定（出来事の一部）。省略時は直近1件。event/insight/action/outcome/takeaway を渡す。",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "対象判断事例を特定するキーワード。省略時は直近1件" },
          event: { type: "string", description: "出来事（新しい内容）" },
          insight: { type: "string", description: "気づき・本質" },
          action: { type: "string", description: "とった対応" },
          outcome: { type: "string", description: "結果" },
          takeaway: { type: "string", description: "学び・教訓" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_decision_case",
      description:
        "誤って記録した判断事例を削除する。「さっきの判断事例消して・いらない」など。match で対象特定。削除後「取り消して」で復元。",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "削除対象を特定するキーワード。省略時は直近1件" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description:
        "新しい案件（プロジェクト）を作成する。「○○案件立てて」「△△の案件を新規で」など。" +
        "status は リード/提案/受注/進行中/完了/失注 のいずれか（省略可）。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "案件名" },
          status: {
            type: "string",
            enum: ["リード", "提案", "受注", "進行中", "完了", "失注"],
            description: "ステータス（省略可）",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project",
      description:
        "既存案件の名前変更・ステータス更新（クローズ含む）。「○○案件、△△に改名」「□□案件 完了／受注／失注にして」「××案件終了」など。" +
        "match で対象案件を特定。new_name で改名、status でステータス更新（完了/失注=クローズ）。",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "対象案件名の一部" },
          new_name: { type: "string", description: "新しい案件名（改名時）" },
          status: {
            type: "string",
            enum: ["リード", "提案", "受注", "進行中", "完了", "失注"],
            description: "新しいステータス（終了/クローズ=完了 or 失注）",
          },
        },
        required: ["match"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_service",
      description:
        "新しいサービス（商品メニュー）を作成する。「○○というサービス作って」「△△メニュー追加」など。",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "サービス名" },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rename_service",
      description:
        "既存サービスの名前を変更する。「○○サービス、△△に改名」など。match で対象を特定。",
      parameters: {
        type: "object",
        properties: {
          match: { type: "string", description: "対象サービス名の一部" },
          new_name: { type: "string", description: "新しいサービス名" },
        },
        required: ["match", "new_name"],
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
    case "reopen_task":
      return executeReopenTask(args, ctx);
    case "set_task_priority":
      return executeSetTaskPriority(args, ctx);
    case "rename_task":
      return executeRenameTask(args, ctx);
    case "restore_task":
      return executeRestoreTask(args, ctx);
    case "undo_last_action":
      return executeUndoLastAction(args, ctx);
    case "edit_conversation_log":
      return executeEditConversationLog(args, ctx);
    case "delete_conversation_log":
      return executeDeleteConversationLog(args, ctx);
    case "edit_reminder":
      return executeEditReminder(args, ctx);
    case "delete_reminder":
      return executeDeleteReminder(args, ctx);
    case "edit_referral_log":
      return executeEditReferralLog(args, ctx);
    case "delete_referral_log":
      return executeDeleteReferralLog(args, ctx);
    case "edit_decision_case":
      return executeEditDecisionCase(args, ctx);
    case "delete_decision_case":
      return executeDeleteDecisionCase(args, ctx);
    case "create_project":
      return executeCreateProject(args, ctx);
    case "update_project":
      return executeUpdateProject(args, ctx);
    case "create_service":
      return executeCreateService(args, ctx);
    case "rename_service":
      return executeRenameService(args, ctx);
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

  // 相対日付（「今日/明日/明後日/N日後」「今週の金曜」「金曜まで」等）は元発言から
  // コードで確定し、LLM の日付誤計算（金曜6/12 を 6/10 と誤る等）を上書きする。
  const llmDue = typeof args.due_date === "string" ? args.due_date : undefined;
  const codeWeekdayDate = ctx.userText
    ? resolveRelativeDate(ctx.userText, todayJST())
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

  // 新規作成のときだけアンドゥ対象にする（既存更新の取り消しは別操作なので記録しない）。
  if (!saved.updated) {
    await recordUndo(ctx.tenantId, {
      op: "create",
      taskId: saved.id,
      label: `タスク追加「${name}」`,
    });
  }

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
  await recordUndo(ctx.tenantId, {
    op: "complete",
    taskId: target.id,
    label: `完了「${target.name}」`,
    before: { status: target.status },
  });
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
  // 新しい期限：相対表現（「明日」「来週の金曜」「金曜まで」等）は元発言からコード確定、無ければ LLM 引数。
  const codeDate = ctx.userText
    ? resolveRelativeDate(ctx.userText, todayJST())
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
  await recordUndo(ctx.tenantId, {
    op: "reschedule",
    taskId: target.id,
    label: `期限変更「${target.name}」→ ${newDue}`,
    before: { dueDate: target.dueDate },
  });
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
  await recordUndo(ctx.tenantId, {
    op: "delete",
    taskId: target.id,
    label: `削除「${target.name}」`,
    before: {},
  });
  return {
    toolName: "cancel_task",
    ok: true,
    summary: `タスクをやめました（削除）「${target.name}」。元に戻す場合は「戻して」と送ってください。`,
  };
}

// 完了済みタスクを未着手に戻す（再オープン）。完了済みの中から1件特定する。
async function executeReopenTask(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const query =
    typeof args.task_query === "string" ? args.task_query.trim() : "";
  if (!query) {
    return { toolName: "reopen_task", ok: false, summary: "task_query 未指定" };
  }
  const matches = await searchTasksByName(ctx.tenantId, query, 5);
  const done = matches.filter((t) => t.status === "完了");
  // 完了済みが見つからなければ、そもそも未完了なら「既に未完了」と返す。
  if (done.length === 0) {
    if (matches.length > 0) {
      return {
        toolName: "reopen_task",
        ok: false,
        summary: `「${query}」に一致するタスクは完了済みではありません（既に未完了）`,
      };
    }
    return {
      toolName: "reopen_task",
      ok: false,
      summary: `「${query}」に一致するタスクが見つかりません`,
    };
  }
  if (done.length > 1) {
    return {
      toolName: "reopen_task",
      ok: false,
      summary: `「${query}」に一致する完了済みタスクが${done.length}件。もう少し具体的に書いてください (候補: ${done
        .slice(0, 3)
        .map((t) => `「${t.name}」`)
        .join(" / ")})`,
    };
  }
  const target = done[0];
  const ok = await updateTaskStatus(ctx.tenantId, target.id, "未着手");
  if (!ok) {
    return { toolName: "reopen_task", ok: false, summary: "再オープン失敗" };
  }
  return {
    toolName: "reopen_task",
    ok: true,
    summary: `タスクを未完了に戻しました「${target.name}」`,
  };
}

// 既存タスクの優先度を変更する（高/中/低）。未完了の中から1件特定する。
async function executeSetTaskPriority(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const query =
    typeof args.task_query === "string" ? args.task_query.trim() : "";
  const priorityRaw =
    typeof args.priority === "string" ? args.priority.trim() : "";
  const priority = ["高", "中", "低"].includes(priorityRaw) ? priorityRaw : "";
  if (!query) {
    return { toolName: "set_task_priority", ok: false, summary: "task_query 未指定" };
  }
  if (!priority) {
    return {
      toolName: "set_task_priority",
      ok: false,
      summary: "優先度は 高 / 中 / 低 のいずれかで指定してください",
    };
  }
  const matches = await searchTasksByName(ctx.tenantId, query, 5);
  const open = matches.filter((t) => t.status !== "完了");
  if (open.length === 0) {
    return {
      toolName: "set_task_priority",
      ok: false,
      summary: `「${query}」に一致する未完了タスクが見つかりません`,
    };
  }
  if (open.length > 1) {
    return {
      toolName: "set_task_priority",
      ok: false,
      summary: `「${query}」に一致するタスクが${open.length}件。もう少し具体的に書いてください (候補: ${open
        .slice(0, 3)
        .map((t) => `「${t.name}」`)
        .join(" / ")})`,
    };
  }
  const target = open[0];
  const prev = await getTaskById(ctx.tenantId, target.id);
  const ok = await updateTaskPriority(ctx.tenantId, target.id, priority);
  if (!ok) {
    return { toolName: "set_task_priority", ok: false, summary: "優先度変更失敗" };
  }
  await recordUndo(ctx.tenantId, {
    op: "priority",
    taskId: target.id,
    label: `優先度「${priority}」「${target.name}」`,
    before: { priority: prev?.priority ?? null },
  });
  return {
    toolName: "set_task_priority",
    ok: true,
    summary: `優先度を「${priority}」に変更「${target.name}」`,
  };
}

// 既存タスクの名前（内容）を修正する。未完了の中から1件特定する。
async function executeRenameTask(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const query =
    typeof args.task_query === "string" ? args.task_query.trim() : "";
  const newName =
    typeof args.new_name === "string" ? args.new_name.trim() : "";
  if (!query) {
    return { toolName: "rename_task", ok: false, summary: "task_query 未指定" };
  }
  if (!newName) {
    return { toolName: "rename_task", ok: false, summary: "新しいタスク名が未指定" };
  }
  const matches = await searchTasksByName(ctx.tenantId, query, 5);
  const open = matches.filter((t) => t.status !== "完了");
  if (open.length === 0) {
    return {
      toolName: "rename_task",
      ok: false,
      summary: `「${query}」に一致する未完了タスクが見つかりません`,
    };
  }
  if (open.length > 1) {
    return {
      toolName: "rename_task",
      ok: false,
      summary: `「${query}」に一致するタスクが${open.length}件。もう少し具体的に書いてください (候補: ${open
        .slice(0, 3)
        .map((t) => `「${t.name}」`)
        .join(" / ")})`,
    };
  }
  const target = open[0];
  const ok = await updateTaskName(ctx.tenantId, target.id, newName);
  if (!ok) {
    return { toolName: "rename_task", ok: false, summary: "タスク名変更失敗" };
  }
  await recordUndo(ctx.tenantId, {
    op: "rename",
    taskId: target.id,
    label: `名前変更→「${newName}」`,
    before: { name: target.name },
  });
  return {
    toolName: "rename_task",
    ok: true,
    summary: `タスク名を変更「${target.name}」→「${newName}」`,
  };
}

// 削除（ソフト削除）したタスクを復元する。削除済みの中から1件特定する。
async function executeRestoreTask(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const query =
    typeof args.task_query === "string" ? args.task_query.trim() : "";
  if (!query) {
    return { toolName: "restore_task", ok: false, summary: "task_query 未指定" };
  }
  // includeTrashed=true で削除済みも含めて検索し、削除済み（deletedAt 有り）に絞る。
  const matches = await searchTasksByName(ctx.tenantId, query, 5, true);
  const trashed = matches.filter((t) => t.deletedAt != null);
  if (trashed.length === 0) {
    return {
      toolName: "restore_task",
      ok: false,
      summary: `「${query}」に一致する削除済みタスクが見つかりません`,
    };
  }
  if (trashed.length > 1) {
    return {
      toolName: "restore_task",
      ok: false,
      summary: `「${query}」に一致する削除済みタスクが${trashed.length}件。もう少し具体的に書いてください (候補: ${trashed
        .slice(0, 3)
        .map((t) => `「${t.name}」`)
        .join(" / ")})`,
    };
  }
  const target = trashed[0];
  const ok = await restoreTask(ctx.tenantId, target.id);
  if (!ok) {
    return { toolName: "restore_task", ok: false, summary: "復元失敗" };
  }
  return {
    toolName: "restore_task",
    ok: true,
    summary: `タスクを復元しました「${target.name}」`,
  };
}

// 直前のタスク操作を取り消す（アンドゥ）。ai_clone_undo に保存した before へ戻す。
async function executeUndoLastAction(
  _args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const undo = await readUndo(ctx.tenantId);
  if (!undo) {
    return {
      toolName: "undo_last_action",
      ok: false,
      summary: "取り消せる直前の操作がありません",
    };
  }

  // タスク系の取り消しは taskId 必須。先に確定させて型も絞る。
  const isTaskOp =
    undo.op === "complete" ||
    undo.op === "reschedule" ||
    undo.op === "delete" ||
    undo.op === "create" ||
    undo.op === "priority" ||
    undo.op === "rename";
  if (isTaskOp && !undo.taskId) {
    return {
      toolName: "undo_last_action",
      ok: false,
      summary: "取り消し対象のタスクが特定できませんでした",
    };
  }
  const taskId = undo.taskId as string;

  let ok = false;
  let detail = "";
  switch (undo.op) {
    case "complete":
      // 完了 → 元の状態（未着手 等）へ戻す
      ok = await updateTaskFields(ctx.tenantId, taskId, {
        status: undo.before?.status ?? "未着手",
      });
      detail = `完了を取り消し（${undo.before?.status ?? "未着手"}に戻す）`;
      break;
    case "reschedule":
      // 期限変更 → 元の期限へ（null=未設定にも戻せる）
      ok = await updateTaskFields(ctx.tenantId, taskId, {
        dueDate: undo.before?.dueDate ?? null,
      });
      detail = `期限変更を取り消し（${undo.before?.dueDate ?? "期限なし"}に戻す）`;
      break;
    case "delete":
      // 削除 → 復元
      ok = await restoreTask(ctx.tenantId, taskId);
      detail = "削除を取り消し（復元）";
      break;
    case "create":
      // 作成 → ソフト削除
      ok = await deleteTask(ctx.tenantId, taskId);
      detail = "作成を取り消し（削除）";
      break;
    case "priority":
      ok = await updateTaskFields(ctx.tenantId, taskId, {
        priority: undo.before?.priority ?? null,
      });
      detail = `優先度変更を取り消し（${undo.before?.priority ?? "未設定"}に戻す）`;
      break;
    case "rename":
      ok = await updateTaskFields(ctx.tenantId, taskId, {
        name: undo.before?.name,
      });
      detail = `名前変更を取り消し（「${undo.before?.name ?? ""}」に戻す）`;
      break;
    case "log_delete":
      // 削除した追記ログをスナップショットから再作成して戻す。
      ok = await recreateFromSnapshot(ctx.tenantId, undo.entity, undo.snapshot);
      detail = "削除を取り消し（再作成）";
      break;
    case "log_edit":
      // 編集前のフィールドへ戻す。
      ok = await restoreLogFields(
        ctx.tenantId,
        undo.entity,
        undo.recordId,
        undo.fieldsBefore,
      );
      detail = "編集を取り消し（元に戻す）";
      break;
    default:
      return {
        toolName: "undo_last_action",
        ok: false,
        summary: "取り消し方法が不明な操作でした",
      };
  }

  if (!ok) {
    return { toolName: "undo_last_action", ok: false, summary: "取り消しに失敗しました" };
  }
  // 一度取り消したら同じ操作を二重に取り消さないようクリア
  await clearUndo(ctx.tenantId);
  return {
    toolName: "undo_last_action",
    ok: true,
    summary: `直前の操作を取り消しました：${undo.label}（${detail}）`,
  };
}

// 削除した追記ログをスナップショットから再作成（アンドゥ用・entity分岐）。
async function recreateFromSnapshot(
  tenantId: string,
  entity: UndoEntity | undefined,
  snapshot: Record<string, unknown> | undefined,
): Promise<boolean> {
  if (!entity || !snapshot) return false;
  if (entity === "conversation") {
    const r = await createConversationLog(tenantId, {
      summary: String(snapshot.summary ?? ""),
      content: snapshot.content ? String(snapshot.content) : undefined,
      occurredAt: snapshot.occurredAt ? String(snapshot.occurredAt) : undefined,
      channel: snapshot.channel ? String(snapshot.channel) : undefined,
      nextAction: snapshot.nextAction ? String(snapshot.nextAction) : undefined,
      importance: (snapshot.importance as "S" | "A" | "B" | "C") || undefined,
      personIds: Array.isArray(snapshot.personIds)
        ? (snapshot.personIds as string[])
        : [],
    });
    return !!r;
  }
  if (entity === "reminder") {
    const r = await createDatedReminderRecord(tenantId, {
      title: String(snapshot.title ?? ""),
      baseDate: String(snapshot.baseDate ?? ""),
      recurrence:
        (snapshot.recurrence as "none" | "yearly" | "monthly" | "milestone") ||
        "none",
      milestoneMonths: Array.isArray(snapshot.milestoneMonths)
        ? (snapshot.milestoneMonths as number[])
        : [],
      note: snapshot.note ? String(snapshot.note) : undefined,
    });
    return !!r;
  }
  if (entity === "referral") {
    const r = await createReferralActivity(tenantId, {
      kind: (snapshot.kind as "asked" | "gave") || "asked",
      content: String(snapshot.content ?? ""),
      date: snapshot.date ? String(snapshot.date) : undefined,
      peopleIds: Array.isArray(snapshot.peopleIds)
        ? (snapshot.peopleIds as string[])
        : [],
    });
    return !!r;
  }
  if (entity === "decision") {
    const r = await createDecisionCase(tenantId, {
      event: String(snapshot.event ?? ""),
      insight: snapshot.insight as string | undefined,
      action: snapshot.action as string | undefined,
      outcome: snapshot.outcome as string | undefined,
      takeaway: snapshot.takeaway as string | undefined,
      intent: snapshot.intent as string | undefined,
      boundary: snapshot.boundary as string | undefined,
      reflection: snapshot.reflection as string | undefined,
      reusable_when: snapshot.reusable_when as string | undefined,
      emotion: snapshot.emotion as string | undefined,
      occurredAt: snapshot.occurredAt as string | undefined,
    });
    return !!r;
  }
  return false;
}

// 編集前フィールドへ戻す（アンドゥ用・entity分岐）。
async function restoreLogFields(
  tenantId: string,
  entity: UndoEntity | undefined,
  recordId: string | undefined,
  fieldsBefore: Record<string, unknown> | undefined,
): Promise<boolean> {
  if (!entity || !recordId || !fieldsBefore) return false;
  if (entity === "conversation") {
    const ok = await updateConversationLogFields(tenantId, recordId, {
      summary: fieldsBefore.summary as string | undefined,
      content: fieldsBefore.content as string | undefined,
      occurredAt: fieldsBefore.occurredAt as string | undefined,
      channel: fieldsBefore.channel as string | undefined,
      nextAction: fieldsBefore.nextAction as string | undefined,
      importance: fieldsBefore.importance as "S" | "A" | "B" | "C" | undefined,
    });
    if (Array.isArray(fieldsBefore.personIds)) {
      await setConversationLogPeople(
        recordId,
        fieldsBefore.personIds as string[],
      );
    }
    return ok;
  }
  if (entity === "reminder") {
    return await updateDatedReminderFields(tenantId, recordId, {
      title: fieldsBefore.title as string | undefined,
      baseDate: fieldsBefore.baseDate as string | undefined,
      recurrence: fieldsBefore.recurrence as
        | "none"
        | "yearly"
        | "monthly"
        | "milestone"
        | undefined,
      note: fieldsBefore.note as string | undefined,
    });
  }
  if (entity === "referral") {
    return await updateReferralActivity(tenantId, recordId, {
      content: fieldsBefore.content as string | undefined,
      kind: fieldsBefore.kind as "asked" | "gave" | undefined,
    });
  }
  if (entity === "decision") {
    return await updateDecisionCaseFields(tenantId, recordId, {
      event: fieldsBefore.event as string | undefined,
      insight: fieldsBefore.insight as string | undefined,
      action: fieldsBefore.action as string | undefined,
      outcome: fieldsBefore.outcome as string | undefined,
      takeaway: fieldsBefore.takeaway as string | undefined,
    });
  }
  return false;
}

// people_names を id 配列に解決する（曖昧は first を避け、未解決名を返す）。
async function resolvePeopleNamesToIds(
  tenantId: string,
  names: string[],
): Promise<{ ids: string[]; ambiguous: string[] }> {
  const ids: string[] = [];
  const ambiguous: string[] = [];
  for (const n of names) {
    const r = await resolvePerson(tenantId, n);
    if (!r) continue;
    if (r.state === "ambiguous") {
      ambiguous.push(n);
      continue;
    }
    ids.push(r.id);
  }
  return { ids, ambiguous };
}

// 会話ログの対象を特定（match キーワードで要約部分一致、無ければ直近1件）。
async function resolveConversationLogTarget(
  tenantId: string,
  match: string,
): Promise<{ id: string; summary: string } | null> {
  const recent = await findRecentConversationLogs(tenantId, match ? 20 : 1);
  if (recent.length === 0) return null;
  if (!match) return recent[0];
  const nq = match.replace(/[\s　]/g, "").toLowerCase();
  const hit = recent.find((r) =>
    (r.summary || "").replace(/[\s　]/g, "").toLowerCase().includes(nq),
  );
  return hit ?? null;
}

async function executeEditConversationLog(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  const target = await resolveConversationLogTarget(ctx.tenantId, match);
  if (!target) {
    return {
      toolName: "edit_conversation_log",
      ok: false,
      summary: match
        ? `「${match}」に一致する会話ログが見つかりません`
        : "直近の会話ログが見つかりません",
    };
  }

  // アンドゥ用に編集前スナップショットを取得
  const before = await getConversationLogSnapshot(ctx.tenantId, target.id);

  const patch: {
    summary?: string;
    content?: string;
    channel?: string;
    nextAction?: string;
    importance?: "S" | "A" | "B" | "C";
  } = {};
  if (typeof args.summary === "string") patch.summary = args.summary.trim();
  if (typeof args.content === "string") patch.content = args.content.trim();
  if (typeof args.channel === "string") patch.channel = args.channel.trim();
  if (typeof args.next_action === "string")
    patch.nextAction = args.next_action.trim();
  if (
    typeof args.importance === "string" &&
    ["S", "A", "B", "C"].includes(args.importance)
  )
    patch.importance = args.importance as "S" | "A" | "B" | "C";

  const peopleNames = Array.isArray(args.people_names)
    ? (args.people_names as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    : [];

  const changes: string[] = [];
  if (Object.keys(patch).length > 0) {
    const ok = await updateConversationLogFields(ctx.tenantId, target.id, patch);
    if (!ok) {
      return { toolName: "edit_conversation_log", ok: false, summary: "会話ログ更新失敗" };
    }
    if (patch.summary) changes.push("要約");
    if (patch.content) changes.push("本文");
    if (patch.channel) changes.push("チャネル");
    if (patch.nextAction) changes.push("次アクション");
    if (patch.importance) changes.push("重要度");
  }
  if (peopleNames.length > 0) {
    const { ids, ambiguous } = await resolvePeopleNamesToIds(
      ctx.tenantId,
      peopleNames,
    );
    if (ambiguous.length > 0) {
      return {
        toolName: "edit_conversation_log",
        ok: false,
        summary: `「${ambiguous.join("/")}」が同名複数人で特定できません。フルネームで再送してください`,
      };
    }
    await setConversationLogPeople(target.id, ids);
    changes.push("関連人物");
  }

  if (changes.length === 0) {
    return {
      toolName: "edit_conversation_log",
      ok: false,
      summary: "変更内容が指定されていません",
    };
  }

  if (before) {
    await recordUndo(ctx.tenantId, {
      op: "log_edit",
      entity: "conversation",
      recordId: target.id,
      label: `会話ログ訂正「${target.summary}」`,
      fieldsBefore: before as unknown as Record<string, unknown>,
    });
  }
  return {
    toolName: "edit_conversation_log",
    ok: true,
    summary: `会話ログを訂正しました（${changes.join("・")}）「${patch.summary ?? target.summary}」`,
  };
}

async function executeDeleteConversationLog(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  const target = await resolveConversationLogTarget(ctx.tenantId, match);
  if (!target) {
    return {
      toolName: "delete_conversation_log",
      ok: false,
      summary: match
        ? `「${match}」に一致する会話ログが見つかりません`
        : "直近の会話ログが見つかりません",
    };
  }
  const snapshot = await getConversationLogSnapshot(ctx.tenantId, target.id);
  const ok = await deleteConversationLog(ctx.tenantId, target.id);
  if (!ok) {
    return { toolName: "delete_conversation_log", ok: false, summary: "会話ログ削除失敗" };
  }
  if (snapshot) {
    await recordUndo(ctx.tenantId, {
      op: "log_delete",
      entity: "conversation",
      label: `会話ログ削除「${target.summary}」`,
      snapshot: snapshot as unknown as Record<string, unknown>,
    });
  }
  return {
    toolName: "delete_conversation_log",
    ok: true,
    summary: `会話ログを削除しました「${target.summary}」。元に戻す場合は「取り消して」と送ってください。`,
  };
}

// 日付リマインドの対象を特定（タイトル部分一致）。
async function resolveReminderTarget(
  tenantId: string,
  match: string,
): Promise<{ id: string; title: string; active: boolean } | null> {
  const recent = await findRecentDatedReminders(tenantId, 30);
  if (recent.length === 0) return null;
  if (!match) return recent[0];
  const nq = match.replace(/[\s　]/g, "").toLowerCase();
  const hit = recent.find((r) =>
    (r.title || "").replace(/[\s　]/g, "").toLowerCase().includes(nq),
  );
  return hit ?? null;
}

async function executeEditReminder(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  const target = await resolveReminderTarget(ctx.tenantId, match);
  if (!target) {
    return {
      toolName: "edit_reminder",
      ok: false,
      summary: `「${match}」に一致するリマインドが見つかりません`,
    };
  }
  const before = await getDatedReminderSnapshot(ctx.tenantId, target.id);

  const patch: {
    title?: string;
    baseDate?: string;
    recurrence?: "none" | "yearly" | "monthly" | "milestone";
    note?: string;
    active?: boolean;
  } = {};
  if (typeof args.title === "string") patch.title = args.title.trim();
  if (typeof args.note === "string") patch.note = args.note.trim();
  if (
    typeof args.recurrence === "string" &&
    ["none", "yearly", "monthly", "milestone"].includes(args.recurrence)
  )
    patch.recurrence = args.recurrence as
      | "none"
      | "yearly"
      | "monthly"
      | "milestone";
  if (typeof args.active === "boolean") patch.active = args.active;
  // 新しい対象日：YYYY-MM-DD ならそのまま、相対表現なら元発言からコード確定。
  const rawDate = typeof args.new_date === "string" ? args.new_date.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    patch.baseDate = rawDate;
  } else if (ctx.userText) {
    const code = resolveRelativeDate(ctx.userText, todayJST());
    if (code) patch.baseDate = code;
  }

  if (Object.keys(patch).length === 0) {
    return {
      toolName: "edit_reminder",
      ok: false,
      summary: "変更内容が指定されていません",
    };
  }
  const ok = await updateDatedReminderFields(ctx.tenantId, target.id, patch);
  if (!ok) {
    return { toolName: "edit_reminder", ok: false, summary: "リマインド更新失敗" };
  }
  if (before) {
    await recordUndo(ctx.tenantId, {
      op: "log_edit",
      entity: "reminder",
      recordId: target.id,
      label: `リマインド変更「${target.title}」`,
      fieldsBefore: before as unknown as Record<string, unknown>,
    });
  }
  const what =
    patch.active === false
      ? "停止しました"
      : patch.active === true
        ? "再開しました"
        : "変更しました";
  return {
    toolName: "edit_reminder",
    ok: true,
    summary: `リマインドを${what}「${patch.title ?? target.title}」${patch.baseDate ? `（${patch.baseDate}）` : ""}`,
  };
}

async function executeDeleteReminder(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  const target = await resolveReminderTarget(ctx.tenantId, match);
  if (!target) {
    return {
      toolName: "delete_reminder",
      ok: false,
      summary: `「${match}」に一致するリマインドが見つかりません`,
    };
  }
  const snapshot = await getDatedReminderSnapshot(ctx.tenantId, target.id);
  const ok = await deleteDatedReminder(ctx.tenantId, target.id);
  if (!ok) {
    return { toolName: "delete_reminder", ok: false, summary: "リマインド削除失敗" };
  }
  if (snapshot) {
    await recordUndo(ctx.tenantId, {
      op: "log_delete",
      entity: "reminder",
      label: `リマインド削除「${target.title}」`,
      snapshot: snapshot as unknown as Record<string, unknown>,
    });
  }
  return {
    toolName: "delete_reminder",
    ok: true,
    summary: `リマインドを削除しました「${target.title}」。元に戻す場合は「取り消して」と送ってください。`,
  };
}

// 紹介ログの対象を特定（内容部分一致、無ければ直近1件）。
async function resolveReferralTarget(
  tenantId: string,
  match: string,
): Promise<{ id: string; content: string; activityType: string } | null> {
  const recent = await findRecentReferralActivities(tenantId, match ? 30 : 1);
  if (recent.length === 0) return null;
  if (!match) return recent[0];
  const nq = match.replace(/[\s　]/g, "").toLowerCase();
  const hit = recent.find((r) =>
    (r.content || "").replace(/[\s　]/g, "").toLowerCase().includes(nq),
  );
  return hit ?? null;
}

async function executeEditReferralLog(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  const target = await resolveReferralTarget(ctx.tenantId, match);
  if (!target) {
    return {
      toolName: "edit_referral_log",
      ok: false,
      summary: match
        ? `「${match}」に一致する紹介ログが見つかりません`
        : "直近の紹介ログが見つかりません",
    };
  }
  const before = await getReferralActivitySnapshot(ctx.tenantId, target.id);
  const patch: { content?: string; kind?: "asked" | "gave" } = {};
  if (typeof args.content === "string") patch.content = args.content.trim();
  if (args.kind === "asked" || args.kind === "gave") patch.kind = args.kind;
  if (Object.keys(patch).length === 0) {
    return {
      toolName: "edit_referral_log",
      ok: false,
      summary: "変更内容が指定されていません",
    };
  }
  const ok = await updateReferralActivity(ctx.tenantId, target.id, patch);
  if (!ok) {
    return { toolName: "edit_referral_log", ok: false, summary: "紹介ログ更新失敗" };
  }
  if (before) {
    await recordUndo(ctx.tenantId, {
      op: "log_edit",
      entity: "referral",
      recordId: target.id,
      label: `紹介ログ訂正「${target.content.slice(0, 20)}」`,
      fieldsBefore: before as unknown as Record<string, unknown>,
    });
  }
  const kindLabel = patch.kind
    ? patch.kind === "gave"
      ? "（紹介した/実施）"
      : "（紹介を頼んだ）"
    : "";
  return {
    toolName: "edit_referral_log",
    ok: true,
    summary: `紹介ログを訂正しました${kindLabel}「${patch.content ?? target.content.slice(0, 20)}」`,
  };
}

async function executeDeleteReferralLog(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  const target = await resolveReferralTarget(ctx.tenantId, match);
  if (!target) {
    return {
      toolName: "delete_referral_log",
      ok: false,
      summary: match
        ? `「${match}」に一致する紹介ログが見つかりません`
        : "直近の紹介ログが見つかりません",
    };
  }
  const snapshot = await getReferralActivitySnapshot(ctx.tenantId, target.id);
  const ok = await deleteReferralActivity(ctx.tenantId, target.id);
  if (!ok) {
    return { toolName: "delete_referral_log", ok: false, summary: "紹介ログ削除失敗" };
  }
  if (snapshot) {
    await recordUndo(ctx.tenantId, {
      op: "log_delete",
      entity: "referral",
      label: `紹介ログ削除「${target.content.slice(0, 20)}」`,
      snapshot: snapshot as unknown as Record<string, unknown>,
    });
  }
  return {
    toolName: "delete_referral_log",
    ok: true,
    summary: `紹介ログを削除しました（KPIの母数から外れます）。元に戻す場合は「取り消して」と送ってください。`,
  };
}

// 判断事例の対象を特定（出来事 event の部分一致、無ければ直近1件）。
async function resolveDecisionCaseTarget(
  tenantId: string,
  match: string,
): Promise<{ id: string; event: string } | null> {
  const recent = await findRecentDecisionCases(tenantId, match ? 30 : 1);
  if (recent.length === 0) return null;
  if (!match) return recent[0];
  const nq = match.replace(/[\s　]/g, "").toLowerCase();
  const hit = recent.find((r) =>
    (r.event || "").replace(/[\s　]/g, "").toLowerCase().includes(nq),
  );
  return hit ?? null;
}

async function executeEditDecisionCase(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  const target = await resolveDecisionCaseTarget(ctx.tenantId, match);
  if (!target) {
    return {
      toolName: "edit_decision_case",
      ok: false,
      summary: match
        ? `「${match}」に一致する判断事例が見つかりません`
        : "直近の判断事例が見つかりません",
    };
  }
  const before = await getDecisionCaseSnapshot(ctx.tenantId, target.id);
  const patch: {
    event?: string;
    insight?: string;
    action?: string;
    outcome?: string;
    takeaway?: string;
  } = {};
  for (const k of ["event", "insight", "action", "outcome", "takeaway"] as const) {
    if (typeof args[k] === "string") patch[k] = (args[k] as string).trim();
  }
  if (Object.keys(patch).length === 0) {
    return {
      toolName: "edit_decision_case",
      ok: false,
      summary: "変更内容が指定されていません",
    };
  }
  const ok = await updateDecisionCaseFields(ctx.tenantId, target.id, patch);
  if (!ok) {
    return { toolName: "edit_decision_case", ok: false, summary: "判断事例更新失敗" };
  }
  if (before) {
    await recordUndo(ctx.tenantId, {
      op: "log_edit",
      entity: "decision",
      recordId: target.id,
      label: `判断事例訂正「${target.event.slice(0, 20)}」`,
      fieldsBefore: before,
    });
  }
  return {
    toolName: "edit_decision_case",
    ok: true,
    summary: `判断事例を訂正しました「${patch.event ?? target.event.slice(0, 20)}」`,
  };
}

async function executeDeleteDecisionCase(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  const target = await resolveDecisionCaseTarget(ctx.tenantId, match);
  if (!target) {
    return {
      toolName: "delete_decision_case",
      ok: false,
      summary: match
        ? `「${match}」に一致する判断事例が見つかりません`
        : "直近の判断事例が見つかりません",
    };
  }
  const snapshot = await getDecisionCaseSnapshot(ctx.tenantId, target.id);
  const ok = await deleteDecisionCase(ctx.tenantId, target.id);
  if (!ok) {
    return { toolName: "delete_decision_case", ok: false, summary: "判断事例削除失敗" };
  }
  if (snapshot) {
    await recordUndo(ctx.tenantId, {
      op: "log_delete",
      entity: "decision",
      label: `判断事例削除「${target.event.slice(0, 20)}」`,
      snapshot,
    });
  }
  return {
    toolName: "delete_decision_case",
    ok: true,
    summary: `判断事例を削除しました「${target.event.slice(0, 20)}」。元に戻す場合は「取り消して」と送ってください。`,
  };
}

async function executeCreateProject(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const name = typeof args.name === "string" ? args.name.trim() : "";
  if (!name) {
    return { toolName: "create_project", ok: false, summary: "案件名が未指定" };
  }
  const status =
    typeof args.status === "string" &&
    (PROJECT_STATUSES as readonly string[]).includes(args.status)
      ? args.status
      : undefined;
  const saved = await createProjectRecord(ctx.tenantId, { name, status });
  if (!saved) {
    return { toolName: "create_project", ok: false, summary: "案件作成失敗" };
  }
  return {
    toolName: "create_project",
    ok: true,
    summary: `案件を作成「${name}」${status ? `（${status}）` : ""}`,
  };
}

async function executeUpdateProject(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  if (!match) {
    return { toolName: "update_project", ok: false, summary: "対象案件（match）が未指定" };
  }
  const matches = await searchProjectsByName(ctx.tenantId, match, 5);
  if (matches.length === 0) {
    return {
      toolName: "update_project",
      ok: false,
      summary: `「${match}」に一致する案件が見つかりません`,
    };
  }
  if (matches.length > 1) {
    return {
      toolName: "update_project",
      ok: false,
      summary: `「${match}」に一致する案件が${matches.length}件。具体的に (候補: ${matches
        .slice(0, 3)
        .map((p) => `「${p.name}」`)
        .join(" / ")})`,
    };
  }
  const target = matches[0];
  const patch: { name?: string; status?: string } = {};
  if (typeof args.new_name === "string" && args.new_name.trim())
    patch.name = args.new_name.trim();
  if (
    typeof args.status === "string" &&
    (PROJECT_STATUSES as readonly string[]).includes(args.status)
  )
    patch.status = args.status;
  if (Object.keys(patch).length === 0) {
    return {
      toolName: "update_project",
      ok: false,
      summary: "変更内容（new_name か status）が指定されていません",
    };
  }
  const ok = await updateProjectFields(ctx.tenantId, target.id, patch);
  if (!ok) {
    return { toolName: "update_project", ok: false, summary: "案件更新失敗" };
  }
  const parts: string[] = [];
  if (patch.name) parts.push(`改名→「${patch.name}」`);
  if (patch.status) parts.push(`ステータス→${patch.status}`);
  return {
    toolName: "update_project",
    ok: true,
    summary: `案件「${target.name}」を更新（${parts.join("・")}）`,
  };
}

async function executeCreateService(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const name = typeof args.name === "string" ? args.name.trim() : "";
  if (!name) {
    return { toolName: "create_service", ok: false, summary: "サービス名が未指定" };
  }
  const saved = await createServiceRecord(ctx.tenantId, { name });
  if (!saved) {
    return { toolName: "create_service", ok: false, summary: "サービス作成失敗" };
  }
  return {
    toolName: "create_service",
    ok: true,
    summary: `サービスを作成「${name}」`,
  };
}

async function executeRenameService(
  args: Record<string, unknown>,
  ctx: ExecuteContext,
): Promise<ToolExecutionReport> {
  const match = typeof args.match === "string" ? args.match.trim() : "";
  const newName =
    typeof args.new_name === "string" ? args.new_name.trim() : "";
  if (!match || !newName) {
    return {
      toolName: "rename_service",
      ok: false,
      summary: "対象（match）と新しい名前（new_name）が必要です",
    };
  }
  const matches = await searchServicesByName(ctx.tenantId, match, 5);
  if (matches.length === 0) {
    return {
      toolName: "rename_service",
      ok: false,
      summary: `「${match}」に一致するサービスが見つかりません`,
    };
  }
  if (matches.length > 1) {
    return {
      toolName: "rename_service",
      ok: false,
      summary: `「${match}」に一致するサービスが${matches.length}件。具体的に (候補: ${matches
        .slice(0, 3)
        .map((s) => `「${s.name}」`)
        .join(" / ")})`,
    };
  }
  const target = matches[0];
  const ok = await updateServiceName(ctx.tenantId, target.id, newName);
  if (!ok) {
    return { toolName: "rename_service", ok: false, summary: "サービス名変更失敗" };
  }
  return {
    toolName: "rename_service",
    ok: true,
    summary: `サービス名を変更「${target.name}」→「${newName}」`,
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
        "【重要】タスクの『完了』と『やめる（削除）』を絶対に混同しないこと。" +
        "「○○完了／終わった／やった／済んだ／できた」は complete_task（実績として残す）。" +
        "cancel_task（削除）は「やめる／中止／いらない／やらない／不要／キャンセル」と明示された時だけ使う。" +
        "やり遂げたタスクを削除してはいけない（完了記録が消える）。判断に迷ったら complete_task を選ぶ。" +
        "「○○やっぱりまだ終わってない／完了取り消して／再開」は reopen_task（完了→未着手に戻す）。" +
        "「○○優先度上げて／緊急で／最優先」は set_task_priority（緊急・最優先=高）。" +
        "「○○の件、△△に直して／名前を変えて」は rename_task。" +
        "「○○戻して／復元して」（削除したタスクを戻す）は restore_task。" +
        "「さっきの取り消して／間違えた／今のなし／元に戻して」（対象を挙げず直近の操作を戻す）は undo_last_action。" +
        "既存の会話ログ（記録済みの打合せ等）の訂正「さっきの会話、相手は△△／要約直して」は edit_conversation_log、" +
        "誤記録の削除「さっきの会話記録消して」は delete_conversation_log（新しい会話の記録 log_conversation と混同しない＝過去に記録済みのものを直す/消す方）。" +
        "既存の日付リマインド（記念日・誕生日・周年・定例）の変更・停止「誕生日3/30に直して／この毎月のやめて・もう通知しないで」は edit_reminder（停止は active=false）、削除「記念日もういらない」は delete_reminder（新規登録ではなく既存を直す/消す方）。" +
        "既存の紹介ログの訂正「あれは頼んだじゃなく与えた／内容直して」は edit_referral_log、削除「やっぱり紹介してない／二重記録した・消して」は delete_referral_log（新規記録 log_referral ではなく既存を直す/消す方。KPIの母数に影響）。" +
        "既存の判断事例の訂正「さっきの判断事例の学び直して」は edit_decision_case、削除「あの判断事例消して」は delete_decision_case（新規記録 log_decision_case ではなく既存を直す/消す方）。" +
        "案件の新規作成「○○案件立てて」は create_project、改名・ステータス更新「△△案件を完了/受注/失注に・改名」は update_project（終了/クローズ=完了 or 失注）。" +
        "サービスの新規作成「○○というサービス作って」は create_service、改名は rename_service。" +
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

  // データ保全ガード：削除は不可逆なので「削除／やめる／中止／いらない／やらない／
  // キャンセル」等を明示した時だけ実行する。それ以外で mini が cancel_task を選んでも
  // complete_task（非破壊）に矯正する。「下記二つ完了」で完了タスクが消えるのを防ぐ。
  const hasCancelSignal =
    /(削除|消して|消す|やめ|辞め|止め|中止|キャンセル|cancel|いらない|要らない|やらない|不要|取り消|取消)/i.test(
      userMessage,
    );

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
    let effectiveName = call.function.name;
    if (effectiveName === "cancel_task" && !hasCancelSignal) {
      effectiveName = "complete_task";
    }
    const rep = await executeOne(effectiveName, args, {
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
