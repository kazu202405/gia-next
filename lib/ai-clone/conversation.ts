// AI Clone の会話処理エンジン。
//
// 入口:
//   generateReply(tenantId, userMessage) — Slack DM や将来の他チャネルから呼ばれる。
//   tenantId はチャネル層（例: Slack events route）で送信者→テナント解決済み。
//
// データ層:
//   旧: lib/ai-clone/notion-db.ts + lib/ai-clone/notion.ts（Notion 直接書込）
//   新: lib/ai-clone/supabase-db.ts（Supabase + 自前スキーマ）
//   Google Calendar は引き続き lib/ai-clone/google.ts を使用（カレンダー予定取得）。

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { fetchTodayEvents, fetchUpcomingEvents } from "./google";
import { REFERRAL_KNOWLEDGE } from "./referral-knowledge";
import {
  fetchExecutiveContext,
  resolvePerson,
  createConversationLog,
  createNote,
  upsertJournalEntry,
  createPersonaTraitCandidate,
  fetchAdoptedPersonaTraits,
  PERSONA_TRAIT_CATEGORIES,
  type PersonaTraitCategory,
  findOrCreateCompany,
  createPersonDetailed,
  findPersonByEmail,
  findConversationLogByApproxSummaryAndDate,
  appendConversationLog,
  updatePersonPipeline,
  searchPeopleByName,
  fetchRecentConversationLogsForPerson,
  fetchRecentNotesForPerson,
  getTenantPrimaryCalendarId,
  findOpenTasks,
  getActivePendingAction,
  deletePendingAction,
  createTaskRecord,
  createDatedReminderRecord,
  type PendingActionRow,
} from "./supabase-db";
import { dispatchMutateTools } from "./tools";
import { aiCloneReadTools, executeReadTool } from "./read-tools";

export type ChatChannel = "Slack" | "LINE" | "Web";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// メイン：ユーザーメッセージにAIで応答
// 2026-05-17：externalUserId / channel を受け取り、曖昧マッチ確認の往復（pending_action）に対応。
//             既存呼び出しコードが externalUserId / channel を省略しても動くように引数はオプション化している。
export async function generateReply(
  tenantId: string,
  userMessage: string,
  externalUserId?: string,
  channel?: ChatChannel,
): Promise<string> {
  const client = getClient();
  if (!client) {
    return "（OpenAI APIキー未設定のため、現在は応答できません）";
  }

  // 0) ペンディング（曖昧確認の返答待ち）があれば優先処理
  if (externalUserId && channel) {
    const pending = await getActivePendingAction(tenantId, channel, externalUserId);
    if (pending) {
      const resolved = await handlePendingAction(
        tenantId,
        externalUserId,
        channel,
        pending,
        userMessage,
      );
      if (resolved !== null) return resolved;
      // null = pending を解決する返答ではなかった → 通常フローへ。
      // 候補番号を待ち続ける必要があるため pending は残す。
    }
  }

  const intent = await classifyIntent(client, userMessage);

  switch (intent) {
    case "help":
      return handleHelp();
    case "transcript":
      return await handleTranscript(client, tenantId, userMessage);
    case "businessCard":
      return await handleBusinessCard(client, tenantId, userMessage);
    case "reminder":
      return await handleReminder(client, tenantId, userMessage);
    case "reflection":
      return await handleReflection(client, tenantId, userMessage);
    case "remark":
      return await handleRemark(client, tenantId, userMessage);
    case "pipelineUpdate":
      return await handlePipelineUpdate(client, tenantId, userMessage);
    case "mutate":
      return await handleMutate(
        client,
        tenantId,
        userMessage,
        externalUserId,
        channel,
      );
    default:
      return await handleQuery(client, tenantId, userMessage);
  }
}

// =============================================
// PendingAction の解決（曖昧マッチ確認の往復）
// =============================================

// pending を解決できれば最終応答テキストを返す。
// 解決できる返信ではなかった場合（通常メッセージ等）は null を返し、通常フローへ。
async function handlePendingAction(
  tenantId: string,
  externalUserId: string,
  channel: ChatChannel,
  pending: PendingActionRow,
  userMessage: string,
): Promise<string | null> {
  const trimmed = userMessage.trim();

  // キャンセル系：明示的に「キャンセル」「やめる」と言われたら pending 破棄
  if (/^(キャンセル|やめる|中止|cancel)$/i.test(trimmed)) {
    await deletePendingAction(pending.id);
    return "キャンセルしました。";
  }

  if (pending.actionKind === "log_conversation_disambiguate") {
    return await resolveLogConversationDisambig(
      tenantId,
      pending,
      trimmed,
    );
  }

  // 未知の action_kind は無視（通常フローへ）
  return null;
}

async function resolveLogConversationDisambig(
  tenantId: string,
  pending: PendingActionRow,
  userInput: string,
): Promise<string | null> {
  const payload = pending.payload as {
    toolArgs?: Record<string, unknown>;
    resolvedPersonIds?: string[];
    resolvedNames?: string[];
    newlyCreated?: string[];
    ambiguousName?: string;
    candidates?: Array<{ id: string; name: string; companyHint: string }>;
  };
  const candidates = payload.candidates || [];
  if (candidates.length === 0) {
    await deletePendingAction(pending.id);
    return null;
  }

  // 番号で選択（半角・全角どちらも）
  let chosen: { id: string; name: string } | null = null;
  const normalized = userInput.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  if (/^[0-9]+$/.test(normalized)) {
    const n = Number(normalized);
    if (n >= 1 && n <= candidates.length) {
      chosen = { id: candidates[n - 1].id, name: candidates[n - 1].name };
    }
  }

  // 名前で選択（候補内の完全一致 or 部分一致）
  if (!chosen) {
    const target = userInput.toLowerCase().replace(/\s+/g, "");
    const exact = candidates.find(
      (c) => c.name.toLowerCase().replace(/\s+/g, "") === target,
    );
    if (exact) {
      chosen = { id: exact.id, name: exact.name };
    } else if (target.length >= 2) {
      const partial = candidates.find((c) => {
        const cname = c.name.toLowerCase().replace(/\s+/g, "");
        return cname.includes(target) || target.includes(cname);
      });
      if (partial) chosen = { id: partial.id, name: partial.name };
    }
  }

  if (!chosen) {
    // 解釈できなければ候補リストを再掲して promptし続ける。
    // ただし他意図のメッセージかもしれないので、すごく短い入力でなければ
    // 通常フローに譲る（null を返す）。
    if (userInput.length > 20) return null;
    const list = candidates
      .map(
        (c, i) =>
          `${i + 1}) ${c.name}${c.companyHint ? `（${c.companyHint}）` : ""}`,
      )
      .join("\n");
    return `「${payload.ambiguousName ?? "対象人物"}」の候補が複数あります。番号で返信してください：\n${list}\n\nやめる場合は「キャンセル」と返信してください。`;
  }

  // chosen 確定。元の log_conversation を実行する。
  const toolArgs = (payload.toolArgs ?? {}) as Record<string, unknown>;
  const summary = typeof toolArgs.summary === "string" ? toolArgs.summary : "";
  const content = typeof toolArgs.content === "string" ? toolArgs.content : "";
  if (!summary || !content) {
    await deletePendingAction(pending.id);
    return "ペンディングデータが不正だったため処理を中断しました。もう一度同じ内容を送ってください。";
  }

  const personIds = [...(payload.resolvedPersonIds ?? []), chosen.id];
  const allNames = [...(payload.resolvedNames ?? []), chosen.name];

  const created = await createConversationLog(tenantId, {
    summary,
    content,
    channel: typeof toolArgs.channel === "string" ? toolArgs.channel : "対面",
    nextAction:
      typeof toolArgs.next_action === "string" && toolArgs.next_action.trim()
        ? toolArgs.next_action.trim()
        : undefined,
    importance:
      typeof toolArgs.importance === "string"
        ? (toolArgs.importance as "S" | "A" | "B" | "C")
        : undefined,
    personIds,
  });

  await deletePendingAction(pending.id);

  if (!created) {
    return `「${chosen.name}」で確定しましたが、会話ログ作成に失敗しました。`;
  }

  return `✅ 会話ログを記録しました：「${summary}」\n   関係者: ${allNames.join(" / ")}`;
}

// =============================================
// 意図分類
// =============================================

type Intent =
  | "help"
  | "transcript"
  | "businessCard"
  | "reminder"
  | "reflection"
  | "remark"
  | "pipelineUpdate"
  | "mutate"
  | "query";

async function classifyIntent(client: OpenAI, text: string): Promise<Intent> {
  const trimmed = text.trim();

  if (trimmed.length < 1) return "query";

  // ヘルプ系（短文一致）
  if (/^(\?|？|help|ヘルプ|コマンド|使い方)$/i.test(trimmed)) return "help";

  // 明示プレフィックス（最優先）
  if (/^(議事録|面談|memo|meeting)[:：\s]/i.test(trimmed)) return "transcript";
  if (/^(名刺|business[\s-]?card|card)[:：\s]/i.test(trimmed))
    return "businessCard";
  // リマインド系（口語の言い回しも同じ意味で受ける）。中身の締切/記念日は handleReminder 内で AI 判別。
  if (/^(リマインド|覚えといて|覚えといて|思い出させて|思い出して|reminder)[:：\s]/i.test(trimmed))
    return "reminder";
  if (/^(振り返り|日報|日誌|reflection)[:：\s]/i.test(trimmed))
    return "reflection";
  if (/^(備考|人物メモ|note)[:：\s]/i.test(trimmed)) return "remark";
  if (/^(進捗|ファネル|pipeline)[:：\s]/i.test(trimmed))
    return "pipelineUpdate";

  // 自然文でのファネル更新（プレフィックスなし）
  if (
    /(さん|氏|様)[にがへ]?(.{0,10}(サロン|アプリ).{0,5}(提案|参加|入会|商談|受注|契約)|提案した|参加した|入会した|商談した|受注した)/.test(
      trimmed,
    )
  ) {
    return "pipelineUpdate";
  }

  // 自然文での mutate（人物属性更新 / タスク追加・完了 / 会話ログ記録）の早期検知。
  // ファネル更新と被らない範囲で、明らかな書込み意図のパターンだけ拾う。
  // 紹介関係 / 関心ごと追加 / 関係性・温度感・重要度 / タスク追加・完了 / 会話ログ記録
  if (
    /(紹介(元|先)|紹介された|紹介してもらった|から紹介|を紹介)/.test(trimmed) ||
    /(関心|興味)(に|として|として).{0,15}(追加|加え|入れ)/.test(trimmed) ||
    /(重要度|温度感|関係性|信頼度|信用度)[をはが].{0,10}(に|へ)/.test(trimmed) ||
    /(タスク|やること|TODO|todo)[にをへ].{0,10}追加/i.test(trimmed) ||
    /(.{1,30})(やる|やります|やった|やりました|終わった|終わりました|完了|完了した|完了しました|done)$/i.test(
      trimmed,
    ) ||
    // 会話ログ系：「○○さんと話した」「○○と打合せ」「○○と電話」「○○とランチ」「○○に相談」など
    /(さん|氏|様|くん|ちゃん)?[とに](.{0,15})?(話した|話しした|話して|打合せ|打ち合わせ|ミーティング|電話[しを]|ランチ|食事|会食|お茶|飲み|会った|会いに|相談|伝え|連絡[しを])/.test(
      trimmed,
    ) ||
    // 判断事例ログ系：本人の判断・学び・気づき・対応を語る自然文
    //   「学びとして」「気づいた」「分かった」「判断した」「と思った」「対応した」
    //   「本当は」「本質的に」「原則として」など
    /(学び(として|だった|として)|気づい(た|て)|分かった|判断(した|として|は)|対応(した|して)|本(質的に|当は|当に)は|原則(として|は)|教訓|反省|今なら|次は)/.test(
      trimmed,
    )
  ) {
    return "mutate";
  }

  // 短いメッセージは会話扱い
  if (trimmed.length < 25) return "query";

  // AI fallback（曖昧な長文）
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `次のテキストを分類してください。JSON: { "intent": "transcript" | "businessCard" | "reminder" | "reflection" | "remark" | "pipelineUpdate" | "mutate" | "query" }

- transcript: 会議の議事録・面談記録（参加者と話した内容、決定、ToDoが含まれる）
- businessCard: 名刺の文字情報（氏名・会社・役職・メール・電話の羅列）
- reminder: 後で思い出したい予定。締切（「○日までに」）や記念日・特定日（誕生日・周年・サービス開始◯ヶ月・毎年/毎月）を覚えさせる依頼
- reflection: 1日や数日の振り返り・日報・気づきまとめ
- remark: 特定人物への短い気づき・観察メモ（「○○さんは〜」型の1〜2文）
- pipelineUpdate: 営業ファネルの状態更新（「〇〇さんにサロン提案した」「〇〇さんがアプリ受注した 30万」等の短文・状態通知）
- mutate: データ書き換えを直接指示している短文。下記いずれか：
    * 人物属性の追加更新（例:「田中さんの紹介元は山田さん」「○○の関心に新規開拓追加」）
    * タスク作成・完了（例:「○○やる」「○○終わった」）
    * 会話ログ記録（例:「○○さんと打合せ：…」）
    * 判断事例ログ（例:「今日◯◯あって、こう判断した。学びは…」「本質は××と思って△△した。前向きになった」）
- query: 質問・相談・依頼・雑談・「どうやって○○する？」「○○できる？」など使い方/機能の問い合わせ`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_tokens: 50,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const valid: Intent[] = [
      "transcript",
      "businessCard",
      "reminder",
      "reflection",
      "remark",
      "pipelineUpdate",
      "mutate",
      "query",
    ];
    return valid.includes(parsed.intent) ? parsed.intent : "query";
  } catch {
    return "query";
  }
}

// =============================================
// ヘルプ
// =============================================

function handleHelp(): string {
  return `利用できるコマンド：

📝 議事録: → 会議の議事録を保存
   例: 議事録: 山口さんとの面談
       [内容]
   ※ 複数会議を1メッセージにまとめて投げてもOK
     （# タイトル ヘッダーで分割）
   ※ 本文にURLがあれば中身を自動取得して要約を議事録に統合します

🎴 名刺: → 会った人をPeopleに登録（口語メモでOK）
   例: 名刺: 山田太郎 株式会社ABC 03-1234-5678
       名刺: 宮下桃子 スーツ屋さん、テツジン会で会った
       名刺: 足立麻衣 勉強会で会った、お酒好き、天満で飲む約束
   ※ 出会い・仕事・関心・約束まで拾って人物に保存します

🔔 リマインド: → 後で思い出したいことを登録（締切/記念日をAIが判別）
   例: リマインド: 6/10までに請求書送る        … 期限管理に登録
       リマインド: 田中さん誕生日 3/29 毎年      … 日付管理に登録
       リマインド: ○○社 サービス開始 5/1、3ヶ月と6ヶ月で … 節目で通知
   ※「覚えといて:」「思い出して:」でも同じです
   ※ 前日19時の夜の配信で「明日その日が来ます」と通知します

💭 振り返り: → 日々の振り返りを「日付ごとに1ノート」で保存
   例: 振り返り:
       ## 2026-05-01
       [今日の気づき・出来事・心情を自由記述]
   ※ 複数日まとめてもOK（## YYYY-MM-DD ヘッダーで分割）
   ※ 1日 = 1ノート（本文＋AI要約）として保存
   ※ 「明日やる」系の具体アクションはActionノートに切り出し
   ※ AIがその日の「核」を最大2件まで Decision/Hypothesis/Learning として独立保存（後で月次集計に使う）

📌 備考: → 人物メモ・短い気づきを残す
   例: 備考: 田中さん 新規より既存に愛着強い
   ※ 中身に名前があれば自動で人物に紐づけ

📈 ファネル更新: → 営業の状態を更新（プレフィックス不要）
   例: 山口さんにサロン提案した
       田中さんがアプリ受注した 30万
       鈴木さん商談した
   ※ 提案/参加/商談/受注 を検知して People の日付列を更新

✏️ 人物・タスク 自然文更新（プレフィックス不要）
   例: 田中さんの紹介元は山田さん
       山口さんの関心に新規開拓追加
       佐藤さんの温度感を高に
       資料の準備やる（明日まで）
       金曜の請求書送付 完了
   ※ 人物属性（紹介元 / 関心 / 関係性 / 重要度 / 温度感 / 信頼度 / 次のアクション 等）
     とタスクの作成・完了をAIが判定して反映

🗣️ 会話ログ（プレフィックス不要）
   例: 田中さんと旅費規定の話をした
       石橋さんと打合せ、共同開発の話
       山口さんと電話、来週会うことに
       穴見さんと佐藤さんとランチ、紹介の話
   ※ 「○○と話した」「○○と打合せ」「○○と電話」「○○とランチ」など自然文でOK
   ※ 複数人を書けば全員にリンクされる
   ※ 同名複数のときは候補が返るのでフルネームで再送

📋 タスク照会
   例: 今のタスク / 未完タスク / TODOは？
   ※ ai_clone_task の未完件を一覧で返す

❓ ヘルプ：このコマンド一覧を表示
   例: ヘルプ / ? / コマンド

その他のメッセージはそのまま質問・相談として答えます。`;
}

// =============================================
// Mutate モード（人物属性更新・タスク作成完了 等を tool calling で実行）
// =============================================

async function handleMutate(
  client: OpenAI,
  tenantId: string,
  userMessage: string,
  externalUserId?: string,
  channel?: ChatChannel,
): Promise<string> {
  const result = await dispatchMutateTools(client, tenantId, userMessage, {
    externalUserId,
    channel,
  });
  if (!result.executed) {
    // ツールが選ばれなかった = mutate ではなく query 扱いにフォールバック
    return await handleQuery(client, tenantId, userMessage);
  }

  const reports = result.reports;
  if (reports.length === 0) {
    return "更新を試みましたが、何も反映されませんでした。もう少し具体的に書いてください。";
  }

  const lines: string[] = [];
  const okCount = reports.filter((r) => r.ok).length;
  const ngCount = reports.length - okCount;

  if (ngCount === 0) {
    lines.push(`✅ ${okCount}件 反映しました`);
  } else if (okCount === 0) {
    lines.push(`⚠️ 反映できませんでした（${ngCount}件）`);
  } else {
    lines.push(`✅ ${okCount}件反映 / ⚠️ ${ngCount}件失敗`);
  }
  for (const r of reports) {
    lines.push(`${r.ok ? "・" : "✗"} ${r.summary}`);
  }
  if (result.aiNote) {
    lines.push("");
    lines.push(result.aiNote);
  }
  return lines.join("\n");
}

// =============================================
// 会話モード
// =============================================

async function handleQuery(
  client: OpenAI,
  tenantId: string,
  userMessage: string,
): Promise<string> {
  // ユーザーの質問に登場する人物名を抽出（「山口さん」「田中氏」「鈴木様」等）
  const personNames = extractPersonNames(userMessage);

  // テナントに紐付いた Google Calendar ID を解決（未連携時は env フォールバック）
  const calendarId = (await getTenantPrimaryCalendarId(tenantId)) ?? undefined;

  // 並列取得：経営コンテキスト / 今日の予定 / 今後7日の予定 / 該当人物の蓄積 / 未完タスク
  //          / 採択済み persona_trait（本人の観察された傾向）
  const [
    context, todayEvents, upcomingEvents, personDigests, openTasks,
    adoptedPersonaTraits,
  ] = await Promise.all([
    fetchExecutiveContext(tenantId),
    fetchTodayEvents(calendarId).catch(() => []),
    fetchUpcomingEvents(7, calendarId).catch(() => []),
    Promise.all(personNames.map((name) => buildPersonDigest(tenantId, name))),
    findOpenTasks(tenantId, 20).catch(() => []),
    fetchAdoptedPersonaTraits(tenantId).catch(
      () => ({}) as Record<string, { trait: string; detail: string | null }[]>,
    ),
  ]);

  const todayList = todayEvents.length
    ? todayEvents
        .map(
          (e) =>
            `- ${formatTime(e.start)} ${e.summary}${e.location ? `（${e.location}）` : ""}`,
        )
        .join("\n")
    : "（今日の予定なし）";

  // 未来予定：今日の終わり以降のものだけ拾う（既に終わった本日分は除外）
  const nowMs = Date.now();
  const futureEvents = upcomingEvents.filter((e) => {
    const t = new Date(e.start).getTime();
    return Number.isFinite(t) && t > nowMs;
  });
  const upcomingList = futureEvents.length
    ? futureEvents
        .slice(0, 10)
        .map((e) => `- ${formatDateTime(e.start)} ${e.summary}`)
        .join("\n")
    : "（今後1週間の予定なし）";

  // 人物別の蓄積情報
  const personSection = personDigests
    .filter((d): d is NonNullable<typeof d> => d !== null)
    .map((d) => {
      const meetingsBlock = d.conversationLogs.length
        ? d.conversationLogs
            .map((l) => {
              const head = `- ${l.occurredAt ? l.occurredAt.slice(0, 10) : "日付不明"}：${l.summary}`;
              const body = l.content
                ? `\n  内容：${truncate(l.content, 400)}`
                : "";
              const next = l.nextAction
                ? `\n  次：${truncate(l.nextAction, 200)}`
                : "";
              return head + body + next;
            })
            .join("\n")
        : "（過去の会話記録なし）";

      const notesBlock = d.notes.length
        ? d.notes
            .map(
              (n) =>
                `- [${n.kind}] ${n.date || "日付不明"} ${n.title}${
                  n.content ? `：${truncate(n.content, 200)}` : ""
                }`,
            )
            .join("\n")
        : "（紐付くNotesなし）";

      return `## ${d.label}
### 過去のミーティング
${meetingsBlock}

### 関連Notes（Decision/Hypothesis/Action/Learning/Event）
${notesBlock}`;
    })
    .join("\n\n");

  // 採択済み persona_trait のセクション。category 別に bullet で並べる。
  // ユーザーが /clone/<slug>/core-os/persona-traits で「採択」した傾向だけが
  // 反映されるので、応答時の人格付けに使う材料はここに集約される。
  const personaTraitsSection = (() => {
    const categories = Object.keys(adoptedPersonaTraits);
    if (categories.length === 0) return "";
    const blocks = categories.map((cat) => {
      const lines = adoptedPersonaTraits[cat]
        .map((t) => {
          const head = `- ${t.trait}`;
          return t.detail ? `${head}\n  （${t.detail}）` : head;
        })
        .join("\n");
      return `### ${cat}\n${lines}`;
    });
    return blocks.join("\n\n");
  })();

  // 未完タスクセクション（"今のタスク"/"TODO"系を聞かれたときに使う最重要セクション）
  const openTaskList = openTasks.length
    ? openTasks
        .slice(0, 20)
        .map((t) => {
          const head = `- ${t.name}`;
          const meta: string[] = [];
          if (t.status) meta.push(t.status);
          if (t.priority) meta.push(`優先度:${t.priority}`);
          if (t.dueDate) meta.push(`期限:${t.dueDate}`);
          const tail = meta.length > 0 ? `（${meta.join(" / ")}）` : "";
          return head + tail;
        })
        .join("\n")
    : "（未完タスクなし）";

  const systemPrompt = `あなたはユーザー本人の経営判断を補佐する「Executive AI Clone」です。
返答は端的で、ユーザーの判断軸に沿って助言してください。
重要KPI・ミッション・判断基準は下記「経営コンテキスト」から読み取ってください。
口調は落ち着いた相棒トーン。絵文字は使わない。長くなる場合は箇条書きで。

# あなたができる書き込み操作（聞かれたら案内する。自然文1メッセージで自動発火）
- 人物の属性更新：「田中さんの紹介元は山田さん」「○○の関心に新規開拓を追加」「○○の温度感を熱いに」など
- タスク作成：「◯◯やる」「△△を来週までに」など
- タスク完了：「○○終わった」「△△完了」など
- 会話ログ記録：「○○さんと打合せ：旅費規定の話。次回見積出す」「△△と電話、来週ランチ」など
- 判断事例ログ：「今日◯◯あって、こう判断した。結果△△、学びは□□」のように、本人の判断・対応・結果・学びが入った自然文を送ると、Web の「判断基準 > 事例ログ」に仮登録される（その後 Web で「確認する」を押すと正本化）

「どうやって○○を入れる？」「○○できる？」と聞かれたら、上記の中から該当する操作を 1〜2 行で案内し、具体例文を 1 つ示すこと。実在しない機能を勝手に発明しないこと。

# 過去データの参照（search_* tools）
- 過去の会話・タスク・人物・判断事例について聞かれたら、関連する search_* ツールを呼んで実データを引っ張る。
  * 「○○について話したやつ教えて」「Aさんと最近何話した」→ search_conversations
  * 「期限切れタスク」「○○系のタスク残ってる？」→ search_tasks
  * 「○○系の業界の人」「重要度Sの人」「○○さんから紹介された人」→ search_people
  * 「過去に似た判断あった？」「同じような相談、前にどう対応した？」→ search_decision_cases
- **「Aさんと何を話したか」のように人物が主語の会話検索では、search_conversations の person_name にその名前を入れる（query には入れない）。会話本文に名前が載っていないことが多く、キーワード検索だと取りこぼすため。**
- 「関連人物の蓄積情報」セクションに既にその人物の会話が載っている場合は、ツールを呼ばずそれを使ってよい。逆にツールが「該当なし」でも、このセクションに情報があればそちらを正とする。
- 一般論で答えず、検索結果に基づいて具体的に答える。本当にどこにも無い時だけ「該当なし」と言う（嘘を作らない）。
- 「今日」「今週」「過去30日」などの相対表現は日付に絶対化してから引数に渡す。

ユーザーの質問に特定の人物名が含まれている場合は、必ず下記「関連人物の蓄積情報」を最優先で参照し、
過去のミーティング内容・Notesを踏まえて具体的に答えてください。一般論のテンプレ回答は禁止。

紹介・関係性・人物との接点に関する相談が来た場合は、下記「紹介ノウハウ（GIA 方法論）」を
最優先で参照し、その枠組み（ボトルネック診断5問 / 紹介5条件 / 仕組み化4レイヤー）に沿って答えてください。

「今のタスク」「未完タスク」「TODO」「やること」を聞かれたときは、「未完タスク一覧」セクションをそのまま
番号付きで返してください。優先度・期限がついているものを先に。一般論や提案は混ぜないこと。

「次回」「次の予定」を聞かれたときは、「今後1週間の予定」セクションから今より後の最も近い予定を答えてください。
今日の終わったミーティングを「次回」と呼ばないでください。

# 経営コンテキスト
${context}
${personaTraitsSection ? `\n# あなたの傾向（観察された本人のクセ。応答のトーンや判断のクセに反映してよい）\n${personaTraitsSection}\n` : ""}
${REFERRAL_KNOWLEDGE}

# 今日の予定（既に終わった分も含む）
${todayList}

# 今後1週間の予定（現在時刻より後のもの）
${upcomingList}

# 未完タスク一覧（ai_clone_task より、最大20件）
${openTaskList}
${personSection ? `\n# 関連人物の蓄積情報\n${personSection}\n` : ""}`;

  // tool calling 対応：AI が search_* を呼びたければ呼ぶ → 結果を context に
  // 追加 → 最終応答生成、の2段階パターン。tool call が無ければ 1 回で終わる。
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  try {
    // Step 1：tools 渡しで初回呼び出し。AI が必要と判断したら tool_calls を返す。
    const res1 = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: aiCloneReadTools,
      tool_choice: "auto",
      max_tokens: 800,
    });
    const msg1 = res1.choices[0]?.message;
    if (!msg1) return "（応答なし）";

    // tool_calls が無ければそのまま返す（通常の query）
    if (!msg1.tool_calls || msg1.tool_calls.length === 0) {
      return msg1.content?.trim() || "（応答なし）";
    }

    // Step 2：tool_calls を実行 → 結果を messages に append → 最終応答生成
    messages.push({
      role: "assistant",
      content: msg1.content ?? "",
      tool_calls: msg1.tool_calls,
    });

    const toolResults = await Promise.all(
      msg1.tool_calls.map(async (tc) => {
        if (tc.type !== "function") {
          return { tool_call_id: tc.id, name: "unknown", result: null };
        }
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments || "{}");
        } catch (e) {
          console.error("[ai-clone] tool args parse 失敗:", e);
        }
        const result = await executeReadTool(tc.function.name, parsedArgs, {
          tenantId,
        });
        return {
          tool_call_id: tc.id,
          name: tc.function.name,
          result,
        };
      }),
    );

    for (const tr of toolResults) {
      messages.push({
        role: "tool",
        tool_call_id: tr.tool_call_id,
        content: JSON.stringify(tr.result),
      });
    }

    const res2 = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 800,
      // 2回目では tools を渡さない（無限ループ防止 & 確実に最終応答に集中させる）
    });
    return res2.choices[0]?.message?.content?.trim() || "（応答なし）";
  } catch (err) {
    console.error("[ai-clone] 応答生成失敗:", err);
    return "（応答生成中にエラーが起きました）";
  }
}

// ───────────────────────────────────────────────
// 人物検索ユーティリティ（handleQuery 用）
// ───────────────────────────────────────────────

// 「〇〇さん」「〇〇氏」「〇〇様」等を userMessage から抽出
function extractPersonNames(text: string): string[] {
  const pattern = /([一-龠ぁ-んァ-ヴー々a-zA-Z]+)(さん|氏|様|くん|ちゃん)/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const base = m[1];
    if (base.length >= 2) found.add(base);
  }
  return Array.from(found);
}

// 1人物名 → person を引いて ConversationLogs + Notes を集約
async function buildPersonDigest(
  tenantId: string,
  name: string,
): Promise<{
  label: string;
  conversationLogs: Awaited<ReturnType<typeof fetchRecentConversationLogsForPerson>>;
  notes: Awaited<ReturnType<typeof fetchRecentNotesForPerson>>;
} | null> {
  const candidates = await searchPeopleByName(tenantId, name).catch(() => []);
  if (candidates.length === 0) return null;

  // 同名複数のときは曖昧として全件 union するのではなく、最初の1人を使う
  // （誤検出時のノイズを避けるため。複数解決UIは将来課題）
  const person = candidates[0];

  const [conversationLogs, notes] = await Promise.all([
    fetchRecentConversationLogsForPerson(tenantId, person.id, 5).catch(() => []),
    fetchRecentNotesForPerson(tenantId, person.id, 10).catch(() => []),
  ]);

  const label =
    candidates.length > 1
      ? `${name}さん（同名${candidates.length}人。最新の1人で要約）`
      : `${name}さん`;

  return { label, conversationLogs, notes };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const j = new Date(d.getTime() + jstOffsetMs);
  const m = j.getUTCMonth() + 1;
  const day = j.getUTCDate();
  const hh = String(j.getUTCHours()).padStart(2, "0");
  const mm = String(j.getUTCMinutes()).padStart(2, "0");
  return `${m}/${day} ${hh}:${mm}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

// ───────────────────────────────────────────────
// URL読み取り（handleTranscript 用）
// 議事録に貼られたURLを fetch → 簡易要約して本文に統合する
// ───────────────────────────────────────────────

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"'`)（）「」『』、。]+/g) || [];
  return Array.from(new Set(matches));
}

async function enrichTextWithUrlSummaries(
  client: OpenAI,
  text: string,
): Promise<string> {
  const urls = extractUrls(text);
  if (urls.length === 0) return text;

  // URL多すぎると遅くなる/コストかかるので最大5件まで
  const targets = urls.slice(0, 5);
  const summaries = await Promise.all(
    targets.map(async (url) => ({
      url,
      summary: await fetchAndSummarizeUrl(client, url),
    })),
  );
  const valid = summaries.filter(
    (s): s is { url: string; summary: string } => s.summary !== null,
  );
  if (valid.length === 0) return text;

  const block = valid
    .map((s) => `### ${s.url}\n${s.summary}`)
    .join("\n\n");

  return `${text}\n\n## 参考URL要約（自動取得）\n${block}`;
}

async function fetchAndSummarizeUrl(
  client: OpenAI,
  url: string,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AICloneFetcher/1.0; +https://gia2018.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ctype) && !ctype.startsWith("text/"))
      return null;

    const html = await res.text();

    // 簡易テキスト抽出
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);

    if (cleaned.length < 100) return null;

    const summary = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "次のWebページの内容を要約してください。形式：\n1. 一行サマリ（このページが何か）\n2. 事業内容・サービス・人物・連絡先など、後で人物プロフィールと突き合わせると役立つ情報を箇条書きで\n3. ToDoや行動の手がかりがあれば最後に。\n簡潔に、推測で書かない。記載がない項目は省略。",
        },
        { role: "user", content: `URL: ${url}\n\n${cleaned}` },
      ],
      max_tokens: 500,
    });

    return summary.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[ai-clone] URL読み取り失敗:", url, err);
    return null;
  }
}

// =============================================
// 議事録モード（複数会議対応）
// =============================================

interface MeetingItem {
  meetingTitle: string;
  date?: string;
  participants: { name: string }[];
  agenda?: string;
  summary: string;
  nextActions?: string;
  decisions: { content: string }[];
  hypotheses: { content: string }[];
  actions: { content: string }[];
  learnings: { content: string }[];
  events: { content: string }[];
}

async function handleTranscript(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  // 本文中にURLがあればその中身を取得して要約し、本文に統合してから抽出する
  const enrichedText = await enrichTextWithUrlSummaries(client, text);

  const meetings = await extractMeetings(client, enrichedText);
  if (!meetings || meetings.length === 0) {
    return "議事録として保存しようとしましたが、内容の抽出に失敗しました。";
  }

  // 全会議の参加者を一括解決して、曖昧があれば事前にまとめて警告
  const allNames = Array.from(
    new Set(meetings.flatMap((m) => m.participants.map((p) => p.name))),
  );
  const resolutions = await Promise.all(
    allNames.map(async (n) => ({
      name: n,
      result: await resolvePerson(tenantId, n),
    })),
  );
  const ambiguous = resolutions.filter((r) => r.result?.state === "ambiguous");
  if (ambiguous.length > 0) {
    return buildAmbiguousWarning(
      ambiguous.map((a) => ({
        query: a.name,
        candidates:
          a.result?.state === "ambiguous" ? a.result.candidates : [],
      })),
    );
  }

  // name → personId マップ作成
  const nameToId = new Map<string, { id: string; name: string; created: boolean }>();
  for (const r of resolutions) {
    if (r.result?.state === "single") {
      nameToId.set(r.name, {
        id: r.result.id,
        name: r.result.name,
        created: r.result.created,
      });
    }
  }

  // 各会議を保存
  const reports: string[] = [];
  for (const m of meetings) {
    const peopleIds = m.participants
      .map((p) => nameToId.get(p.name)?.id)
      .filter((id): id is string => !!id);

    const meetingDate = m.date || todayJST();

    // 同じ日に近い summary の ConversationLog があれば追記、無ければ新規作成。
    // 旧 ai_clone_meeting は 0030 で会話ログに統合済み（議題は本文の冒頭にマージ）。
    const existingShell = await findConversationLogByApproxSummaryAndDate(
      tenantId,
      m.meetingTitle,
      meetingDate,
    );
    const summaryWithAgenda =
      m.agenda && m.agenda.trim().length > 0
        ? `${m.meetingTitle}\n\n[議題]\n${m.agenda}`
        : m.meetingTitle;
    let meetingId: string | null = null;
    let appendedToShell = false;
    if (existingShell) {
      const ok = await appendConversationLog(tenantId, existingShell.id, {
        content: enrichedText,
        nextAction: m.nextActions,
        addPersonIds: peopleIds,
      });
      if (ok) {
        meetingId = existingShell.id;
        appendedToShell = true;
      }
    }
    if (!meetingId) {
      const created = await createConversationLog(tenantId, {
        summary: summaryWithAgenda,
        content: enrichedText,
        occurredAt: `${meetingDate}T12:00:00+09:00`,
        channel: "対面",
        nextAction: m.nextActions,
        personIds: peopleIds,
      });
      meetingId = created?.id || null;
    }
    const meeting = meetingId ? { id: meetingId } : null;

    const noteJobs: Promise<any>[] = [];
    const pushNotes = (
      kind: "Decision" | "Hypothesis" | "Action" | "Learning" | "Event",
      items: { content: string }[],
    ) => {
      for (const item of items) {
        noteJobs.push(
          createNote(tenantId, {
            title: item.content.slice(0, 60),
            date: m.date || todayJST(),
            kind,
            content: item.content,
            peopleIds,
          }),
        );
      }
    };
    pushNotes("Decision", m.decisions);
    pushNotes("Hypothesis", m.hypotheses);
    pushNotes("Action", m.actions);
    pushNotes("Learning", m.learnings);
    pushNotes("Event", m.events);
    await Promise.all(noteJobs);

    const noteCount =
      m.decisions.length +
      m.hypotheses.length +
      m.actions.length +
      m.learnings.length +
      m.events.length;

    const participantNames = m.participants
      .map((p) => nameToId.get(p.name)?.name || p.name)
      .join(", ");
    const newlyCreatedNames = m.participants
      .map((p) => nameToId.get(p.name))
      .filter((p) => p?.created)
      .map((p) => p!.name);

    const lines: string[] = [];
    lines.push(`✅「${m.meetingTitle}」`);
    const meetingStatus = meeting?.id
      ? appendedToShell
        ? "1件（既存に追記）"
        : "1件（新規）"
      : "失敗";
    lines.push(`  会話ログ: ${meetingStatus} / Notes: ${noteCount}件`);
    if (participantNames) lines.push(`  参加者: ${participantNames}`);
    if (newlyCreatedNames.length > 0) {
      lines.push(`    ↳ 新規作成: ${newlyCreatedNames.join(", ")}`);
    }
    if (m.nextActions) {
      lines.push(`  📌 次: ${m.nextActions}`);
    }
    reports.push(lines.join("\n"));
  }

  return `議事録を保存しました（${meetings.length}件）：\n\n${reports.join("\n\n")}`;
}

async function extractMeetings(
  client: OpenAI,
  text: string,
): Promise<MeetingItem[] | null> {
  const prompt = `以下の議事録から、会議ごとに分割して構造化抽出してください。
1メッセージに複数会議が含まれる場合があります（# タイトル等で区切られる）。
1会議だけなら配列に1要素入れてください。

# 議事録
${text}

# 出力JSON
{
  "meetings": [
    {
      "meetingTitle": "会議のタイトル（明示なければ参加者名や論点から命名）",
      "date": "YYYY-MM-DD or null",
      "participants": [{ "name": "氏名（自分は含めない）" }],
      "agenda": "議題1〜2行 or null",
      "summary": "要点を1段落",
      "nextActions": "ToDoの連結 or null",
      "decisions": [{ "content": "決定事項" }],
      "hypotheses": [{ "content": "仮説・検討中アイデア" }],
      "actions": [{ "content": "個別ToDo・依頼" }],
      "learnings": [{ "content": "学び・気づき" }],
      "events": [{ "content": "起きた事実・接触履歴" }]
    }
  ]
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!Array.isArray(parsed.meetings)) return null;
    return parsed.meetings.map((m: any) => normalizeMeetingItem(m));
  } catch (err) {
    console.error("[ai-clone] 議事録抽出失敗:", err);
    return null;
  }
}

function normalizeMeetingItem(m: any): MeetingItem {
  return {
    meetingTitle: m.meetingTitle || "（タイトル未抽出）",
    date: m.date || undefined,
    participants: Array.isArray(m.participants)
      ? m.participants.filter((p: any) => p?.name)
      : [],
    agenda: m.agenda || undefined,
    summary: m.summary || "",
    nextActions: m.nextActions || undefined,
    decisions: ensureContentArray(m.decisions),
    hypotheses: ensureContentArray(m.hypotheses),
    actions: ensureContentArray(m.actions),
    learnings: ensureContentArray(m.learnings),
    events: ensureContentArray(m.events),
  };
}

// =============================================
// 振り返りモード（複数日対応）
// =============================================

interface ReflectionItem {
  date: string;
  summary: string;
  rawText: string;
  actions: { content: string }[];
  highlights: {
    kind: "Decision" | "Hypothesis" | "Learning";
    content: string;
  }[];
  // 「五島さんはこういう人」候補。本人モデル抽出（軽め）。
  // 採択は /clone/<slug>/core-os/persona-traits でユーザーが行う。
  personaTraits: {
    category: PersonaTraitCategory;
    trait: string;
    detail?: string;
  }[];
}

async function handleReflection(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const reflections = await extractReflections(client, text);
  if (!reflections || reflections.length === 0) {
    return "振り返りとして抽出できませんでした。";
  }

  const reports: string[] = [];
  for (const r of reflections) {
    // 振り返り本文は ai_clone_journal に UPSERT。同日複数回投稿は追記される。
    // ハイライトや Action は引き続き knowledge_candidate / decision_log / task に分配。
    const journalRawText = r.rawText || text;
    const journalResult = await upsertJournalEntry(tenantId, {
      date: r.date,
      rawText: journalRawText,
      summary: r.summary || null,
    });

    // Action（明日以降のアクション）は独立ノート化
    const sideJobs: Promise<any>[] = [];
    for (const item of r.actions) {
      sideJobs.push(
        createNote(tenantId, {
          title: `[${r.date}] ${item.content.slice(0, 50)}`,
          date: r.date,
          kind: "Action",
          content: item.content,
        }),
      );
    }

    // ハイライト（その日の核となる Decision/Hypothesis/Learning を最大2件）
    const highlightLabel: Record<
      "Decision" | "Hypothesis" | "Learning",
      string
    > = {
      Decision: "決定",
      Hypothesis: "仮説",
      Learning: "学び",
    };
    for (const h of r.highlights) {
      sideJobs.push(
        createNote(tenantId, {
          title: `[${r.date}] ${highlightLabel[h.kind]}: ${h.content.slice(0, 40)}`,
          date: r.date,
          kind: h.kind,
          content: h.content,
        }),
      );
    }

    // 本人特性候補（persona_trait）を candidate として保存。
    // source_journal_id で日記にトレース可能。重複は createPersonaTraitCandidate が抑える。
    let traitNewCount = 0;
    for (const t of r.personaTraits) {
      const res = await createPersonaTraitCandidate(tenantId, {
        category: t.category,
        trait: t.trait,
        detail: t.detail ?? null,
        sourceJournalId: journalResult?.id ?? null,
      });
      if (res && !res.isDuplicate) traitNewCount++;
    }

    await Promise.all(sideJobs);

    const tails: string[] = [];
    if (r.actions.length > 0) tails.push(`Action ${r.actions.length}件`);
    if (r.highlights.length > 0) {
      tails.push(`ハイライト ${r.highlights.length}件`);
    }
    if (traitNewCount > 0) {
      tails.push(`本人特性候補 ${traitNewCount}件`);
    }
    const tailStr = tails.length > 0 ? ` + ${tails.join(" + ")}` : "";
    // 「新規日記 1件」/「既存日記に追記」を呼び出し側で見分けられるよう表示分け
    const journalLabel = !journalResult
      ? "日記の保存に失敗"
      : journalResult.isNew
        ? "日記新規"
        : "日記に追記";
    reports.push(`📅 ${r.date}：${journalLabel}${tailStr}`);
  }

  return `振り返りを保存しました（${reflections.length}日分）：\n${reports.join("\n")}`;
}

async function extractReflections(
  client: OpenAI,
  text: string,
): Promise<ReflectionItem[] | null> {
  const prompt = `以下の振り返りテキストから、日付ごとに分割してください。
1日分でも複数日分でも、配列で返してください。日付の指定がなければ今日の日付（${todayJST()}）を使ってください。

抽出ルール：
- rawText：その日の振り返り原文をそのまま保持。要約せず、原文のまま。## YYYY-MM-DD 等の見出しは除いてOK。
- summary：1〜3行の要約。後から読み返したときに状況が思い出せる粒度。
- actions：「明日以降に自分が取る具体的な行動」だけを抜き出す。観察・気づき・反省・心情は含めない。
  本文中に明示的なアクション宣言がなければ空配列。

- highlights：その日の「核」と言える最重要を**最大2件まで**。それぞれ kind を Decision / Hypothesis / Learning から選ぶ。
  * Decision：明示的に下した意思決定（例：「サロン価格を980円にする」）
  * Hypothesis：観察から立てた仮説・気づき
  * Learning：今後の判断に活きる学び
  * 中途半端な重要度のものは含めない。該当なしの日は空配列。3件以上挙げない。

- personaTraits：振り返り全体から滲み出る「本人の傾向（クセ）」を**最大2件まで**。
  本人が無意識に持っている性格・価値観・行動パターンを 1 行で言い切る。
  あくまで「観察された傾向」であり、本人がその場で決めた判断ではない。
  category は以下のいずれかから選ぶ：
    * 価値観：何を大事にしている人か（例「家族との時間を貴重に感じる」）
    * 判断軸：迷った時どう決める人か（例「広げるより絞る方向を選ぶ」）
    * 学びクセ：どう学んで定着させる人か（例「実装しながら理解するタイプ」）
    * 好み：何を好み何を嫌うか（例「非日常体験で脳がリフレッシュされる」）
    * 息抜き：どう整うか（例「妻と二人での外出で気分転換」）
    * 心理パターン：感情の動き方（例「焦ると夢に出るタイプ」）
    * 仕事スタイル：どう仕事するか（例「隙間時間にも手を動かす」）
    * 関係性パターン：人とどう関わるか（例「相手の才能を観察して助けたい欲が出る」）
  trait は 1 行で言い切る。detail は補足（省略可）。
  「今日 X した」のような単発の出来事ではなく、傾向として読めるものだけ拾う。
  当てはまるものがなければ空配列。

# 振り返り
${text}

# 出力JSON
{
  "reflections": [
    {
      "date": "YYYY-MM-DD",
      "summary": "1〜3行の要約",
      "rawText": "その日の本文をそのまま",
      "actions": [{ "content": "明日以降の具体的な行動" }],
      "highlights": [{ "kind": "Decision" | "Hypothesis" | "Learning", "content": "その日の核となる重要事項" }],
      "personaTraits": [{ "category": "価値観", "trait": "1行で言い切る本人傾向", "detail": "補足（任意）" }]
    }
  ]
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!Array.isArray(parsed.reflections)) return null;
    return parsed.reflections.map((r: any) => ({
      date: r.date || todayJST(),
      summary: r.summary || "",
      rawText: typeof r.rawText === "string" ? r.rawText : "",
      actions: ensureContentArray(r.actions),
      highlights: ensureHighlightArray(r.highlights),
      personaTraits: ensurePersonaTraitArray(r.personaTraits),
    }));
  } catch (err) {
    console.error("[ai-clone] 振り返り抽出失敗:", err);
    return null;
  }
}

// LLM 出力の personaTraits を検証。category は固定リスト内、trait は空でないもののみ。
// 上限 2 件（プロンプトで「最大 2 件」と指示しているが、念のためコード側でも切る）。
function ensurePersonaTraitArray(v: any): {
  category: PersonaTraitCategory;
  trait: string;
  detail?: string;
}[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) =>
      x?.trait
      && typeof x.trait === "string"
      && x.trait.trim().length > 0
      && typeof x.category === "string"
      && (PERSONA_TRAIT_CATEGORIES as readonly string[]).includes(x.category),
    )
    .slice(0, 2)
    .map((x) => ({
      category: x.category as PersonaTraitCategory,
      trait: x.trait.trim(),
      detail: typeof x.detail === "string" && x.detail.trim().length > 0
        ? x.detail.trim()
        : undefined,
    }));
}

// =============================================
// 備考モード（人物紐付けメモ）
// =============================================

interface RemarkExtraction {
  title: string;
  content: string;
  peopleNames: string[];
  kind: "Learning" | "Hypothesis" | "Event";
}

async function handleRemark(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const remark = await extractRemark(client, text);
  if (!remark) {
    return "備考として保存できませんでした。";
  }

  // 人物の解決（曖昧時は警告）
  const resolutions = await Promise.all(
    remark.peopleNames.map(async (n) => ({
      name: n,
      result: await resolvePerson(tenantId, n),
    })),
  );
  const ambiguous = resolutions.filter((r) => r.result?.state === "ambiguous");
  if (ambiguous.length > 0) {
    return buildAmbiguousWarning(
      ambiguous.map((a) => ({
        query: a.name,
        candidates:
          a.result?.state === "ambiguous" ? a.result.candidates : [],
      })),
    );
  }

  const validPeople = resolutions
    .filter((r) => r.result?.state === "single")
    .map((r) => {
      const single = r.result as Extract<
        NonNullable<typeof r.result>,
        { state: "single" }
      >;
      return { id: single.id, name: single.name, created: single.created };
    });

  const note = await createNote(tenantId, {
    title: remark.title.slice(0, 60),
    date: todayJST(),
    kind: remark.kind,
    content: remark.content,
    peopleIds: validPeople.map((p) => p.id),
  });

  const lines: string[] = [];
  if (note?.id) {
    lines.push(`✅ 備考を保存しました（${remark.kind}）`);
    if (validPeople.length > 0) {
      lines.push(`紐付け: ${validPeople.map((p) => p.name).join(", ")}`);
      const newOnes = validPeople.filter((p) => p.created).map((p) => p.name);
      if (newOnes.length > 0) {
        lines.push(`  ↳ 新規作成: ${newOnes.join(", ")}`);
      }
    } else {
      lines.push("（人物紐付けなし、独立メモとして保存）");
    }
  } else {
    lines.push("備考の保存に失敗しました。");
  }
  return lines.join("\n");
}

async function extractRemark(
  client: OpenAI,
  text: string,
): Promise<RemarkExtraction | null> {
  const prompt = `以下のメモから構造化抽出してください。

# メモ
${text}

# 抽出ルール
- title: 1行のタイトル（メモの要点を10〜30字）
- content: 元のメモから「備考:」プレフィックスを除いたテキスト
- peopleNames: 中身で言及されてる人物名（さん/氏/様抜き、なければ空配列）
- kind: 内容に応じて選ぶ
   - "Learning": 一般的な気づき・観察
   - "Hypothesis": 仮説・推測
   - "Event": 起きた事実・接触履歴

# 出力JSON
{
  "title": "...",
  "content": "...",
  "peopleNames": ["..."],
  "kind": "Learning" | "Hypothesis" | "Event"
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const validKinds = ["Learning", "Hypothesis", "Event"];
    return {
      title: parsed.title || text.slice(0, 30),
      content: parsed.content || text,
      peopleNames: Array.isArray(parsed.peopleNames)
        ? parsed.peopleNames.filter((n: any) => typeof n === "string")
        : [],
      kind: validKinds.includes(parsed.kind) ? parsed.kind : "Learning",
    };
  } catch (err) {
    console.error("[ai-clone] 備考抽出失敗:", err);
    return null;
  }
}

// =============================================
// ファネル更新モード（person の date 列を更新）
// =============================================

interface PipelineExtraction {
  personName: string;
  stage: "salonProposal" | "salonJoin" | "appPitch" | "appDeal";
  date: string;
  amount?: number;
}

async function handlePipelineUpdate(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const ext = await extractPipelineUpdate(client, text);
  if (!ext) {
    return "ファネル更新として解釈できませんでした。例: 「山口さんにサロン提案した」「田中さんがアプリ受注した 30万」";
  }

  // 人物解決（曖昧時は警告）
  const r = await resolvePerson(tenantId, ext.personName);
  if (!r) {
    return `人物「${ext.personName}」を解決できませんでした。`;
  }
  if (r.state === "ambiguous") {
    return buildAmbiguousWarning([
      { query: ext.personName, candidates: r.candidates },
    ]);
  }

  const updateParams: Parameters<typeof updatePersonPipeline>[2] = {};
  let stageLabel = "";
  switch (ext.stage) {
    case "salonProposal":
      updateParams.salonProposalDate = ext.date;
      stageLabel = "サロン提案";
      break;
    case "salonJoin":
      updateParams.salonJoinDate = ext.date;
      stageLabel = "サロン参加";
      break;
    case "appPitch":
      updateParams.appPitchDate = ext.date;
      stageLabel = "アプリ商談";
      break;
    case "appDeal":
      updateParams.appDealDate = ext.date;
      stageLabel = "アプリ受注";
      if (typeof ext.amount === "number") {
        updateParams.dealAmount = ext.amount;
      }
      break;
  }

  const ok = await updatePersonPipeline(tenantId, r.id, updateParams);
  if (!ok) {
    return `更新に失敗しました（${r.name} / ${stageLabel}）。`;
  }

  const lines: string[] = [];
  lines.push(`✅ ファネル更新：${r.name}`);
  lines.push(`  ${stageLabel}日: ${ext.date}`);
  if (ext.stage === "appDeal" && typeof ext.amount === "number") {
    lines.push(`  受注金額: ¥${ext.amount.toLocaleString()}`);
  }
  if (r.created) {
    lines.push("  ↳ 新規作成(People に無かったので追加しました)");
  }
  return lines.join("\n");
}

async function extractPipelineUpdate(
  client: OpenAI,
  text: string,
): Promise<PipelineExtraction | null> {
  const today = todayJST();
  const prompt = `次の文から、営業ファネルの更新情報を抽出してください。

# 入力
${text}

# 抽出ルール
- personName: 対象の人物名（さん/氏/様抜き）
- stage: 以下のいずれか
   - "salonProposal": オンラインサロンを提案した
   - "salonJoin": サロンに参加・入会した
   - "appPitch": アプリ商談・提案した
   - "appDeal": アプリ受注・契約した
- date: 「昨日」「今日」「先週」「3日前」等の相対表現は ${today} 起点でYYYY-MM-DDに変換。明示なければ ${today}
- amount: 受注金額が数字で出てくれば数値で（円単位）。「30万」→ 300000、「1.5万」→ 15000、無ければ省略

# 出力JSON
{ "personName": "...", "stage": "...", "date": "YYYY-MM-DD", "amount": 数値 or null }

抽出できない場合は { "personName": "" } を返す`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!parsed.personName || typeof parsed.personName !== "string") return null;
    const validStages = ["salonProposal", "salonJoin", "appPitch", "appDeal"];
    if (!validStages.includes(parsed.stage)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "")) {
      parsed.date = today;
    }
    return {
      personName: parsed.personName.trim(),
      stage: parsed.stage,
      date: parsed.date,
      amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
    };
  } catch (err) {
    console.error("[ai-clone] ファネル抽出失敗:", err);
    return null;
  }
}

// =============================================
// 名刺モード
// =============================================

interface BusinessCardExtraction {
  name: string;
  nameKana?: string;
  companyName?: string;
  role?: string;
  industry?: string;
  email?: string;
  phone?: string;
  hp?: string;
  // 口語メモを捨てないための拡張フィールド
  metContext?: string;
  interests?: string[];
  caveats?: string;
  nextAction?: string;
  nextActionDate?: string; // 約束に日付があれば YYYY-MM-DD（→ 期限タスク化）
}

async function handleBusinessCard(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const card = await extractBusinessCard(client, text);
  if (!card || !card.name) {
    return "人物メモとして認識できませんでした。お名前が含まれているか確認してください。";
  }

  if (card.email) {
    const existing = await findPersonByEmail(tenantId, card.email);
    if (existing) {
      return `この方は既にPeopleに登録されています：「${existing.name}」（メール一致）。新規作成は行いませんでした。`;
    }
  }

  let companyId: string | undefined;
  let companyName = "";
  let companyCreated = false;
  if (card.companyName) {
    const c = await findOrCreateCompany(tenantId, card.companyName, {
      hp: card.hp,
    });
    if (c) {
      companyId = c.id;
      companyName = c.name;
      companyCreated = c.created;
    }
  }

  const person = await createPersonDetailed(tenantId, {
    name: card.name,
    nameKana: card.nameKana,
    companyId,
    role: card.role,
    industry: card.industry,
    email: card.email,
    phone: card.phone,
    ocrText: text,
    metContext: card.metContext,
    interests: card.interests,
    caveats: card.caveats,
    nextAction: card.nextAction,
  });

  const lines: string[] = [];
  if (person) {
    lines.push(`✅ 人物を保存しました：「${card.name}」`);
    if (card.nameKana) lines.push(`よみがな: ${card.nameKana}`);
    if (card.industry) lines.push(`業種: ${card.industry}`);
    if (card.role) lines.push(`仕事: ${card.role}`);
    if (companyName) {
      lines.push(`会社: ${companyName}${companyCreated ? "（新規作成）" : ""}`);
    }
    if (card.metContext) lines.push(`出会い: ${card.metContext}`);
    if (card.interests && card.interests.length > 0)
      lines.push(`関心: ${card.interests.join(" / ")}`);
    if (card.caveats) lines.push(`メモ: ${card.caveats}`);
    if (card.nextAction) {
      lines.push(`📌 約束: ${card.nextAction}`);
      // 日付がある約束はリマインド（期限タスク）にも自動登録 → 前日に通知が飛ぶ
      if (card.nextActionDate) {
        const task = await createTaskRecord(tenantId, {
          name: `${card.name}さん：${card.nextAction}`,
          dueDate: card.nextActionDate,
          peopleIds: [person.id],
        });
        if (task) {
          lines.push(`   → リマインド（期限 ${card.nextActionDate}）も作成しました`);
        }
      }
    }
    if (card.email) lines.push(`メール: ${card.email}`);
    if (card.phone) lines.push(`電話: ${card.phone}`);
  } else {
    lines.push("人物の保存に失敗しました。");
  }
  return lines.join("\n");
}

async function extractBusinessCard(
  client: OpenAI,
  text: string,
): Promise<BusinessCardExtraction | null> {
  const today = todayJST();
  const prompt = `以下は「会った人」のメモ（名刺OCR or 口語の一言メモ）です。人物情報を構造化抽出してください。
正式な名刺とは限らず、「○○さん、テツジン会で会った、スーツ屋さん」のような走り書きが多いです。
書かれた情報を取りこぼさず、適切な項目に振り分けてください。推測で創作はしない。記載のない項目は省略。
今日は ${today}（JST）です。

# 入力
${text}

# 抽出ルール（振り分けを厳密に）
- name: 氏名（必須）
- nameKana: 氏名のよみがな（ひらがな/カタカナ）。本文にフリガナ（例「おかだ　ひろたか」）があれば入れる。無ければ空（勝手に推測しない）。
- companyName: **明確な会社名のときだけ**。「株式会社○○」「○○商事」「○○Inc」など社名と判断できるもの限定。
   「ミナミでBARしてる」「医療系で働いてて」のような状況・業態の説明は会社名に入れない（→ role か metContext へ）。判断できなければ空。
- industry: 業種（例「介護」「飲食」「医療」「不動産」「美容」「士業」「人材」）。その人が属する業界を一語で。判断できなければ空。
- role: 仕事・職種・肩書き・仕事内容（例「就労支援」「公認会計士」「補助金コンサル」「美容液販売」「BAR経営」「代表」）。業種より具体の中身。
- metContext: どこで・どうやって会ったか、出会いのきっかけ（例「テツジン会で会った」「インバウンド勉強会」「ビジマリで会った」「ミナミのBAR」）。
- interests: 関心・嗜好を配列で（例 ["お酒好き"]）。無ければ空配列。
- caveats: 上記に当てはまらない背景・補足メモ（例「元キャバ嬢」「水商売ネットワーク」「もともとNICにいた」）。
- nextAction: 約束・次の接点（例「天満で飲む約束」「来週連絡する」）。無ければ空。
- nextActionDate: その約束に日付・時期があれば YYYY-MM-DD に変換（「来週金曜」「3日後」「6/10」等を ${today} 起点で）。日付が読めない約束（「今度飲む」等）は空。
- email / phone / hp: あれば（phone はハイフン保持）。

# 出力JSON
{
  "name": "...",
  "nameKana": "",
  "companyName": "" ,
  "industry": "",
  "role": "",
  "metContext": "",
  "interests": [],
  "caveats": "",
  "nextAction": "",
  "nextActionDate": "",
  "email": "",
  "phone": "",
  "hp": ""
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!parsed.name) return null;
    const str = (v: unknown): string | undefined =>
      typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
    const interests = Array.isArray(parsed.interests)
      ? parsed.interests
          .filter((x: unknown) => typeof x === "string" && x.trim().length > 0)
          .map((x: string) => x.trim())
      : [];
    return {
      name: String(parsed.name).trim(),
      nameKana: str(parsed.nameKana),
      companyName: str(parsed.companyName),
      role: str(parsed.role),
      industry: str(parsed.industry),
      email: str(parsed.email),
      phone: str(parsed.phone),
      hp: str(parsed.hp),
      metContext: str(parsed.metContext),
      interests: interests.length > 0 ? interests : undefined,
      caveats: str(parsed.caveats),
      nextAction: str(parsed.nextAction),
      nextActionDate:
        typeof parsed.nextActionDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(parsed.nextActionDate)
          ? parsed.nextActionDate
          : undefined,
    };
  } catch (err) {
    console.error("[ai-clone] 人物メモ抽出失敗:", err);
    return null;
  }
}

// =============================================
// リマインドモード（締切 or 記念日を AI 判別して振り分け）
// =============================================

type ReminderRecurrence = "none" | "yearly" | "monthly" | "milestone";

interface ReminderExtraction {
  kind: "deadline" | "date";
  title: string;
  // deadline
  dueDate?: string;
  priority?: string;
  // date
  baseDate?: string;
  recurrence: ReminderRecurrence;
  milestoneMonths: number[];
  note?: string;
}

async function handleReminder(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const ext = await extractReminder(client, text);
  if (!ext || !ext.title) {
    return 'リマインドとして解釈できませんでした。例:「リマインド: 6/10までに請求書送る」「リマインド: 田中さん誕生日 3/29 毎年」「リマインド: ○○社 サービス開始 5/1、3ヶ月と6ヶ月で」';
  }

  if (ext.kind === "deadline") {
    if (!ext.dueDate) {
      return "締切日が読み取れませんでした。日付を入れて送ってください（例：6/10までに / 明日まで）。";
    }
    const created = await createTaskRecord(tenantId, {
      name: ext.title,
      dueDate: ext.dueDate,
      priority: ext.priority,
    });
    if (!created) return "リマインド（期限）の登録に失敗しました。";
    return (
      `✅ 期限リマインドを登録しました（リマインド＞期限管理）\n` +
      `・${ext.title}\n  期限: ${ext.dueDate}${ext.priority ? ` / 優先度:${ext.priority}` : ""}`
    );
  }

  // kind === "date"
  if (!ext.baseDate) {
    return "日付が読み取れませんでした。基準日（誕生日・開始日など）を入れて送ってください。";
  }
  const created = await createDatedReminderRecord(tenantId, {
    title: ext.title,
    baseDate: ext.baseDate,
    recurrence: ext.recurrence,
    milestoneMonths: ext.milestoneMonths,
    note: ext.note,
  });
  if (!created) return "リマインド（日付）の登録に失敗しました。";

  const recLabel =
    ext.recurrence === "milestone"
      ? `節目（${(ext.milestoneMonths ?? []).join("・")}ヶ月）`
      : ext.recurrence === "yearly"
        ? "毎年"
        : ext.recurrence === "monthly"
          ? "毎月"
          : "単発";
  return (
    `✅ 日付リマインドを登録しました（リマインド＞日付管理）\n` +
    `・${ext.title}\n  基準日: ${ext.baseDate} / ${recLabel}` +
    (ext.note ? `\n  メモ: ${ext.note}` : "")
  );
}

async function extractReminder(
  client: OpenAI,
  text: string,
): Promise<ReminderExtraction | null> {
  const today = todayJST();
  const prompt = `次の文をリマインドとして構造化抽出してください。今日は ${today}（JST）です。

# 入力
${text}

# 判別ルール
- kind="deadline"：締切・期限もの（「○日までに」「明日まで」「金曜まで」など、一度きりで完了したら消えるもの）。
- kind="date"：記念日・特定日もの（誕生日・周年・契約更新・サービス開始◯ヶ月など、繰り返す/特定日に思い出したいもの）。
- 相対表現（明日・来週・3日後 等）は ${today} 起点で YYYY-MM-DD に変換。
- recurrence（kind=date のとき）：
   * 「毎年」「誕生日」「周年」→ yearly
   * 「毎月」→ monthly
   * 「○ヶ月」「○ヶ月後」「節目」「3ヶ月と6ヶ月で」等 → milestone（milestoneMonths に月数を配列で）
   * それ以外の単発の特定日 → none
- title：何のリマインドか分かる短い名前。
- 抽出できなければ {"title":""} を返す。

# 出力JSON
{
  "kind": "deadline" | "date",
  "title": "...",
  "dueDate": "YYYY-MM-DD or null",
  "priority": "高 | 中 | 低 or null",
  "baseDate": "YYYY-MM-DD or null",
  "recurrence": "none" | "yearly" | "monthly" | "milestone",
  "milestoneMonths": [数値],
  "note": "... or null"
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });
    const p = JSON.parse(res.choices[0]?.message?.content || "{}");
    const title = typeof p.title === "string" ? p.title.trim() : "";
    if (!title) return null;

    const kind: "deadline" | "date" = p.kind === "date" ? "date" : "deadline";
    const validRec: ReminderRecurrence[] = ["none", "yearly", "monthly", "milestone"];
    const recurrence: ReminderRecurrence = validRec.includes(p.recurrence)
      ? p.recurrence
      : "none";
    const milestoneMonths =
      recurrence === "milestone" && Array.isArray(p.milestoneMonths)
        ? Array.from(
            new Set(
              p.milestoneMonths
                .map((n: unknown) => Math.trunc(Number(n)))
                .filter((n: number) => Number.isFinite(n) && n > 0 && n <= 600),
            ),
          ).sort((a, b) => (a as number) - (b as number))
        : [];
    const isYMD = (v: unknown): v is string =>
      typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const validPriority = ["高", "中", "低"];

    return {
      kind,
      title,
      dueDate: isYMD(p.dueDate) ? p.dueDate : undefined,
      priority: validPriority.includes(p.priority) ? p.priority : undefined,
      baseDate: isYMD(p.baseDate) ? p.baseDate : undefined,
      recurrence,
      milestoneMonths: milestoneMonths as number[],
      note: typeof p.note === "string" && p.note.trim() ? p.note.trim() : undefined,
    };
  } catch (err) {
    console.error("[ai-clone] リマインド抽出失敗:", err);
    return null;
  }
}

// =============================================
// ヘルパー
// =============================================

function buildAmbiguousWarning(
  items: Array<{
    query: string;
    candidates: { id: string; name: string; companyHint: string }[];
  }>,
): string {
  const lines: string[] = [];
  lines.push("⚠️ 同名の人物が複数登録されています。保存を中断しました。");
  lines.push("以下のうちどなたか分かるよう書き直して再投稿してください：");
  lines.push("");
  for (const item of items) {
    lines.push(`「${item.query}」候補:`);
    item.candidates.forEach((c, idx) => {
      const hint = c.companyHint ? `（${c.companyHint}）` : "";
      lines.push(`  ${idx + 1}. ${c.name}${hint}`);
    });
    lines.push("");
  }
  lines.push("例：「田中太郎」のようにフルネームで送ると一意に絞れます。");
  return lines.join("\n");
}

function ensureContentArray(v: any): { content: string }[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x?.content).map((x) => ({ content: x.content }));
}

function ensureHighlightArray(v: any): {
  kind: "Decision" | "Hypothesis" | "Learning";
  content: string;
}[] {
  if (!Array.isArray(v)) return [];
  const valid = v
    .filter(
      (x) =>
        x?.content &&
        typeof x.kind === "string" &&
        ["Decision", "Hypothesis", "Learning"].includes(x.kind),
    )
    .map((x) => ({
      kind: x.kind as "Decision" | "Hypothesis" | "Learning",
      content: x.content as string,
    }));
  return valid.slice(0, 2);
}

function todayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(iso: string): string {
  if (!iso) return "終日";
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
