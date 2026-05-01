import OpenAI from "openai";
import { fetchExecutiveContext } from "./notion";
import { fetchTodayEvents } from "./google";
import {
  findOrCreatePerson,
  createMeeting,
  createNote,
} from "./notion-db";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

// メイン：ユーザーメッセージにAIで応答
export async function generateReply(userMessage: string): Promise<string> {
  const client = getClient();
  if (!client) {
    return "（OpenAI APIキー未設定のため、現在は応答できません）";
  }

  // 1. 議事録/メモ系か、会話か、AIに判定させる（軽量モデル）
  const intent = await classifyIntent(client, userMessage);

  if (intent === "transcript") {
    return await handleTranscript(client, userMessage);
  }

  return await handleQuery(client, userMessage);
}

// ----- 意図分類 -----

async function classifyIntent(
  client: OpenAI,
  text: string
): Promise<"transcript" | "query"> {
  // 短いメッセージは会話と決め打ち（処理省略）
  if (text.trim().length < 30) return "query";

  // 明示的プレフィックスがあれば即決
  if (/^(議事録|面談|memo|meeting)[:：\s]/i.test(text.trim())) {
    return "transcript";
  }

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `次のテキストが「会議の議事録・メモ・面談記録」か「質問・依頼・会話」かを分類してください。
JSON で答えてください: { "intent": "transcript" | "query" }
- transcript: 会議内容の記録、誰と何を話したか、決まったこと、ToDoなどが羅列されている
- query: 質問、相談、依頼、雑談、命令`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_tokens: 50,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    return parsed.intent === "transcript" ? "transcript" : "query";
  } catch {
    return "query";
  }
}

// ----- 会話モード -----

async function handleQuery(client: OpenAI, userMessage: string): Promise<string> {
  const [context, events] = await Promise.all([
    fetchExecutiveContext(),
    fetchTodayEvents().catch(() => []),
  ]);

  const eventList = events.length
    ? events
        .map(
          (e) =>
            `- ${formatTime(e.start)} ${e.summary}${e.location ? `（${e.location}）` : ""}`
        )
        .join("\n")
    : "（今日の予定なし）";

  const systemPrompt = `あなたはユーザー本人の経営判断を補佐する「Executive AI Clone」です。
返答は端的で、ユーザーの判断軸に沿って助言してください。
重要KPI・ミッション・判断基準は下記「経営コンテキスト」から読み取ってください。
口調は落ち着いた相棒トーン。絵文字は使わない。長くなる場合は箇条書きで。

# 経営コンテキスト
${context}

# 今日の予定
${eventList}
`;

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

// ----- 議事録モード -----

interface TranscriptExtraction {
  meetingTitle: string;
  date?: string; // YYYY-MM-DD
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
  text: string
): Promise<string> {
  // 1. AIで構造化抽出
  const extraction = await extractStructure(client, text);
  if (!extraction) {
    return "議事録として保存しようとしましたが、内容の抽出に失敗しました。";
  }

  // 2. 参加者を Notion People から find or create
  const personLookups = await Promise.all(
    extraction.participants.map((p) => findOrCreatePerson(p.name))
  );
  const validPeople = personLookups.filter(
    (p): p is { id: string; name: string; created: boolean } => p !== null
  );
  const peopleIds = validPeople.map((p) => p.id);
  const newlyCreated = validPeople.filter((p) => p.created).map((p) => p.name);

  // 3. Meetings レコード作成
  const meeting = await createMeeting({
    title: extraction.meetingTitle,
    date: extraction.date || todayJST(),
    participantIds: peopleIds,
    agenda: extraction.agenda,
    minutes: text, // 議事録本文は元テキストをそのまま保存
    nextActions: extraction.nextActions,
  });

  // 4. Notes レコード作成（種別ごとにバラして）
  const noteResults: { kind: string; ok: boolean }[] = [];

  const noteJobs: Promise<void>[] = [];
  const pushNote = (
    kind: "Decision" | "Hypothesis" | "Action" | "Learning" | "Event",
    items: { content: string }[]
  ) => {
    items.forEach((item) => {
      noteJobs.push(
        (async () => {
          const r = await createNote({
            title: item.content.slice(0, 60),
            date: extraction.date || todayJST(),
            kind,
            content: item.content,
            peopleIds,
          });
          noteResults.push({ kind, ok: r !== null });
        })()
      );
    });
  };

  pushNote("Decision", extraction.decisions);
  pushNote("Hypothesis", extraction.hypotheses);
  pushNote("Action", extraction.actions);
  pushNote("Learning", extraction.learnings);
  pushNote("Event", extraction.events);

  await Promise.all(noteJobs);

  // 5. 結果を返信
  const lines: string[] = [];
  lines.push(`✅ 議事録を保存しました：「${extraction.meetingTitle}」`);
  if (meeting?.id) {
    lines.push(`Meetings: 1件`);
  } else {
    lines.push(`Meetings: 失敗`);
  }
  lines.push(
    `参加者: ${validPeople.length}名（${validPeople.map((p) => p.name).join(", ") || "なし"}）`
  );
  if (newlyCreated.length > 0) {
    lines.push(`  ↳ 新規作成: ${newlyCreated.join(", ")}`);
  }
  const noteSummary = summarizeNoteResults(noteResults);
  if (noteSummary) lines.push(`Notes: ${noteSummary}`);

  if (extraction.nextActions) {
    lines.push("");
    lines.push(`📌 ネクストアクション:`);
    lines.push(extraction.nextActions);
  }

  return lines.join("\n");
}

async function extractStructure(
  client: OpenAI,
  text: string
): Promise<TranscriptExtraction | null> {
  const prompt = `以下の議事録から構造化データを抽出してください。

# 議事録
${text}

# 抽出ルール
- meetingTitle: 会議のタイトル（明示なければ参加者名や論点から命名）
- date: 日付（YYYY-MM-DD、明示なければ省略）
- participants: 参加者名（自分は含めない）
- agenda: 議題を1〜2行
- summary: 要点を1段落
- nextActions: 全てのToDoを箇条書きに連結（明示なければ省略）
- decisions: 決定事項（種別 Decision）
- hypotheses: 仮説・検討中アイデア（種別 Hypothesis）
- actions: 個別のToDo・依頼（種別 Action）
- learnings: 学び・気づき（種別 Learning）
- events: 起きた事実・接触履歴（種別 Event）

# 出力JSON
{
  "meetingTitle": "...",
  "date": "YYYY-MM-DD or null",
  "participants": [{ "name": "..." }],
  "agenda": "...",
  "summary": "...",
  "nextActions": "...",
  "decisions": [{ "content": "..." }],
  "hypotheses": [{ "content": "..." }],
  "actions": [{ "content": "..." }],
  "learnings": [{ "content": "..." }],
  "events": [{ "content": "..." }]
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");

    return {
      meetingTitle: parsed.meetingTitle || "（タイトル未抽出）",
      date: parsed.date || undefined,
      participants: Array.isArray(parsed.participants)
        ? parsed.participants.filter((p: any) => p?.name)
        : [],
      agenda: parsed.agenda || undefined,
      summary: parsed.summary || "",
      nextActions: parsed.nextActions || undefined,
      decisions: ensureContentArray(parsed.decisions),
      hypotheses: ensureContentArray(parsed.hypotheses),
      actions: ensureContentArray(parsed.actions),
      learnings: ensureContentArray(parsed.learnings),
      events: ensureContentArray(parsed.events),
    };
  } catch (err) {
    console.error("[ai-clone] 議事録抽出失敗:", err);
    return null;
  }
}

function ensureContentArray(v: any): { content: string }[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x?.content).map((x) => ({ content: x.content }));
}

function summarizeNoteResults(
  results: { kind: string; ok: boolean }[]
): string {
  if (results.length === 0) return "";
  const map: Record<string, number> = {};
  for (const r of results) {
    if (!r.ok) continue;
    map[r.kind] = (map[r.kind] || 0) + 1;
  }
  const parts = Object.entries(map).map(([k, n]) => `${k} ×${n}`);
  return parts.length > 0 ? parts.join(" / ") : "0件";
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
