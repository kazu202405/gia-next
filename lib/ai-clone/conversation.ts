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
import { fetchTodayEvents, fetchUpcomingEvents } from "./google";
import { REFERRAL_KNOWLEDGE } from "./referral-knowledge";
import {
  fetchExecutiveContext,
  resolvePerson,
  createMeeting,
  createNote,
  findOrCreateCompany,
  createPersonDetailed,
  findPersonByEmail,
  findMeetingByApproxTitleAndDate,
  appendMeetingMinutes,
  updatePersonPipeline,
  searchPeopleByName,
  fetchRecentMeetingsForPerson,
  fetchRecentNotesForPerson,
  getTenantPrimaryCalendarId,
  findOpenTasks,
} from "./supabase-db";
import { dispatchMutateTools } from "./tools";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// メイン：ユーザーメッセージにAIで応答
export async function generateReply(
  tenantId: string,
  userMessage: string,
): Promise<string> {
  const client = getClient();
  if (!client) {
    return "（OpenAI APIキー未設定のため、現在は応答できません）";
  }

  const intent = await classifyIntent(client, userMessage);

  switch (intent) {
    case "help":
      return handleHelp();
    case "transcript":
      return await handleTranscript(client, tenantId, userMessage);
    case "businessCard":
      return await handleBusinessCard(client, tenantId, userMessage);
    case "reflection":
      return await handleReflection(client, tenantId, userMessage);
    case "remark":
      return await handleRemark(client, tenantId, userMessage);
    case "pipelineUpdate":
      return await handlePipelineUpdate(client, tenantId, userMessage);
    case "mutate":
      return await handleMutate(client, tenantId, userMessage);
    default:
      return await handleQuery(client, tenantId, userMessage);
  }
}

// =============================================
// 意図分類
// =============================================

type Intent =
  | "help"
  | "transcript"
  | "businessCard"
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

  // 自然文での mutate（人物属性更新 / タスク追加・完了）の早期検知
  // ファネル更新と被らない範囲で、明らかな書込み意図のパターンだけ拾う。
  // 紹介関係 / 関心ごと追加 / 関係性・温度感・重要度 / タスク追加・完了
  if (
    /(紹介(元|先)|紹介された|紹介してもらった|から紹介|を紹介)/.test(trimmed) ||
    /(関心|興味)(に|として|として).{0,15}(追加|加え|入れ)/.test(trimmed) ||
    /(重要度|温度感|関係性|信頼度|信用度)[をはが].{0,10}(に|へ)/.test(trimmed) ||
    /(タスク|やること|TODO|todo)[にをへ].{0,10}追加/i.test(trimmed) ||
    /(.{1,30})(やる|やります|やった|やりました|終わった|終わりました|完了|完了した|完了しました|done)$/i.test(
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
          content: `次のテキストを分類してください。JSON: { "intent": "transcript" | "businessCard" | "reflection" | "remark" | "pipelineUpdate" | "mutate" | "query" }

- transcript: 会議の議事録・面談記録（参加者と話した内容、決定、ToDoが含まれる）
- businessCard: 名刺の文字情報（氏名・会社・役職・メール・電話の羅列）
- reflection: 1日や数日の振り返り・日報・気づきまとめ
- remark: 特定人物への短い気づき・観察メモ（「○○さんは〜」型の1〜2文）
- pipelineUpdate: 営業ファネルの状態更新（「〇〇さんにサロン提案した」「〇〇さんがアプリ受注した 30万」等の短文・状態通知）
- mutate: 人物属性の追加更新・タスク作成完了など、データ書き換えを直接指示している短文（例:「田中さんの紹介元は山田さん」「次の打ち手を○○に変えて」「○○の関心に新規開拓追加」「○○やる」「○○終わった」）
- query: 質問・相談・依頼・雑談`,
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

🎴 名刺: → 名刺をPeopleに登録
   例: 名刺: 山田太郎 株式会社ABC 03-1234-5678

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
): Promise<string> {
  const result = await dispatchMutateTools(client, tenantId, userMessage);
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
  const [context, todayEvents, upcomingEvents, personDigests, openTasks] =
    await Promise.all([
      fetchExecutiveContext(tenantId),
      fetchTodayEvents(calendarId).catch(() => []),
      fetchUpcomingEvents(7, calendarId).catch(() => []),
      Promise.all(personNames.map((name) => buildPersonDigest(tenantId, name))),
      findOpenTasks(tenantId, 20).catch(() => []),
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
      const meetingsBlock = d.meetings.length
        ? d.meetings
            .map((m) => {
              const head = `- ${m.date || "日付不明"}：${m.title}`;
              const minutes = m.minutes
                ? `\n  議事録：${truncate(m.minutes, 400)}`
                : "";
              const next = m.nextActions
                ? `\n  次：${truncate(m.nextActions, 200)}`
                : "";
              return head + minutes + next;
            })
            .join("\n")
        : "（過去のミーティング記録なし）";

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

${REFERRAL_KNOWLEDGE}

# 今日の予定（既に終わった分も含む）
${todayList}

# 今後1週間の予定（現在時刻より後のもの）
${upcomingList}

# 未完タスク一覧（ai_clone_task より、最大20件）
${openTaskList}
${personSection ? `\n# 関連人物の蓄積情報\n${personSection}\n` : ""}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 800,
    });
    return res.choices[0]?.message?.content?.trim() || "（応答なし）";
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

// 1人物名 → person を引いて Meetings + Notes を集約
async function buildPersonDigest(
  tenantId: string,
  name: string,
): Promise<{
  label: string;
  meetings: Awaited<ReturnType<typeof fetchRecentMeetingsForPerson>>;
  notes: Awaited<ReturnType<typeof fetchRecentNotesForPerson>>;
} | null> {
  const candidates = await searchPeopleByName(tenantId, name).catch(() => []);
  if (candidates.length === 0) return null;

  // 同名複数のときは曖昧として全件 union するのではなく、最初の1人を使う
  // （誤検出時のノイズを避けるため。複数解決UIは将来課題）
  const person = candidates[0];

  const [meetings, notes] = await Promise.all([
    fetchRecentMeetingsForPerson(tenantId, person.id, 5).catch(() => []),
    fetchRecentNotesForPerson(tenantId, person.id, 10).catch(() => []),
  ]);

  const label =
    candidates.length > 1
      ? `${name}さん（同名${candidates.length}人。最新の1人で要約）`
      : `${name}さん`;

  return { label, meetings, notes };
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

    // 同じ日に骨組み Meeting がいれば追記、無ければ新規作成
    const existingShell = await findMeetingByApproxTitleAndDate(
      tenantId,
      m.meetingTitle,
      meetingDate,
    );
    let meetingId: string | null = null;
    let appendedToShell = false;
    if (existingShell) {
      const ok = await appendMeetingMinutes(tenantId, existingShell.id, {
        agenda: m.agenda,
        minutes: enrichedText,
        nextActions: m.nextActions,
        addParticipantIds: peopleIds,
      });
      if (ok) {
        meetingId = existingShell.id;
        appendedToShell = true;
      }
    }
    if (!meetingId) {
      const created = await createMeeting(tenantId, {
        title: m.meetingTitle,
        date: meetingDate,
        participantIds: peopleIds,
        agenda: m.agenda,
        minutes: enrichedText,
        nextActions: m.nextActions,
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
    lines.push(`  Meetings: ${meetingStatus} / Notes: ${noteCount}件`);
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
    // 1日 = 1ノート（kind="Learning"）。本文＋AI要約を1ノートに統合保存
    const reflectionContent = [
      r.summary ? `# 要約\n${r.summary}` : "",
      r.rawText ? `# 本文\n${r.rawText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    await createNote(tenantId, {
      title: `[${r.date}] 振り返り`,
      date: r.date,
      kind: "Learning",
      content: reflectionContent || text,
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
    await Promise.all(sideJobs);

    const tails: string[] = [];
    if (r.actions.length > 0) tails.push(`Action ${r.actions.length}件`);
    if (r.highlights.length > 0) {
      tails.push(`ハイライト ${r.highlights.length}件`);
    }
    const tailStr = tails.length > 0 ? ` + ${tails.join(" + ")}` : "";
    reports.push(`📅 ${r.date}：振り返り1件${tailStr}`);
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
      "highlights": [{ "kind": "Decision" | "Hypothesis" | "Learning", "content": "その日の核となる重要事項" }]
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
    }));
  } catch (err) {
    console.error("[ai-clone] 振り返り抽出失敗:", err);
    return null;
  }
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
  companyName?: string;
  role?: string;
  email?: string;
  phone?: string;
  hp?: string;
}

async function handleBusinessCard(
  client: OpenAI,
  tenantId: string,
  text: string,
): Promise<string> {
  const card = await extractBusinessCard(client, text);
  if (!card || !card.name) {
    return "名刺として認識できませんでした。氏名が含まれているか確認してください。";
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
    companyId,
    role: card.role,
    email: card.email,
    phone: card.phone,
    ocrText: text,
  });

  const lines: string[] = [];
  if (person) {
    lines.push(`✅ 名刺を保存しました：「${card.name}」`);
    if (card.role) lines.push(`役職: ${card.role}`);
    if (companyName) {
      lines.push(`会社: ${companyName}${companyCreated ? "（新規作成）" : ""}`);
    }
    if (card.email) lines.push(`メール: ${card.email}`);
    if (card.phone) lines.push(`電話: ${card.phone}`);
  } else {
    lines.push("名刺の保存に失敗しました。");
  }
  return lines.join("\n");
}

async function extractBusinessCard(
  client: OpenAI,
  text: string,
): Promise<BusinessCardExtraction | null> {
  const prompt = `以下は名刺のOCR結果です。構造化データを抽出してください。

# OCR結果
${text}

# 抽出ルール
- name: 氏名（必須）
- companyName: 会社名（任意）
- role: 役職・部署（任意）
- email: メールアドレス（任意）
- phone: 電話番号（任意、ハイフン保持）
- hp: 会社のホームページURL（任意）

# 出力JSON
{ "name": "...", "companyName": "...", "role": "...", "email": "...", "phone": "...", "hp": "..." }`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!parsed.name) return null;
    return {
      name: String(parsed.name).trim(),
      companyName: parsed.companyName || undefined,
      role: parsed.role || undefined,
      email: parsed.email || undefined,
      phone: parsed.phone || undefined,
      hp: parsed.hp || undefined,
    };
  } catch (err) {
    console.error("[ai-clone] 名刺抽出失敗:", err);
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
