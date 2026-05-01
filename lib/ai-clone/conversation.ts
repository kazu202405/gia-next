import OpenAI from "openai";
import { fetchExecutiveContext } from "./notion";
import { fetchTodayEvents } from "./google";
import {
  findOrCreatePerson,
  createMeeting,
  createNote,
  findOrCreateCompany,
  createPersonDetailed,
  findPersonByEmail,
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

  // 1. 意図分類（議事録 / 名刺 / 会話）
  const intent = await classifyIntent(client, userMessage);

  if (intent === "transcript") {
    return await handleTranscript(client, userMessage);
  }
  if (intent === "businessCard") {
    return await handleBusinessCard(client, userMessage);
  }

  return await handleQuery(client, userMessage);
}

// ----- 意図分類 -----

type Intent = "transcript" | "businessCard" | "query";

async function classifyIntent(client: OpenAI, text: string): Promise<Intent> {
  const trimmed = text.trim();

  // 短いメッセージは会話と決め打ち
  if (trimmed.length < 20) return "query";

  // 明示プレフィックス
  if (/^(議事録|面談|memo|meeting)[:：\s]/i.test(trimmed)) return "transcript";
  if (/^(名刺|business[\s-]?card|card)[:：\s]/i.test(trimmed))
    return "businessCard";

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `次のテキストを分類してください。JSON: { "intent": "transcript" | "businessCard" | "query" }

- transcript: 会議の議事録・面談記録・話し合った内容のメモ。誰と何を話したか、決定事項、ToDoが含まれる
- businessCard: 名刺の文字情報。氏名・会社名・役職・メール・電話番号・住所などが羅列されている短文
- query: 質問・相談・依頼・雑談`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_tokens: 50,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (parsed.intent === "transcript") return "transcript";
    if (parsed.intent === "businessCard") return "businessCard";
    return "query";
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

// ----- 名刺モード -----

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
  text: string
): Promise<string> {
  const card = await extractBusinessCard(client, text);
  if (!card || !card.name) {
    return "名刺として認識できませんでした。氏名が含まれているか確認してください。";
  }

  // メール一致で既存Person検出（重複防止）
  if (card.email) {
    const existing = await findPersonByEmail(card.email);
    if (existing) {
      return `この方は既にPeopleに登録されています：「${existing.name}」（メール一致）。新規作成は行いませんでした。`;
    }
  }

  // 会社を find or create
  let companyId: string | undefined;
  let companyName = "";
  let companyCreated = false;
  if (card.companyName) {
    const c = await findOrCreateCompany(card.companyName, {
      hp: card.hp,
    });
    if (c) {
      companyId = c.id;
      companyName = c.name;
      companyCreated = c.created;
    }
  }

  // Person を詳細付きで作成
  const person = await createPersonDetailed({
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
  text: string
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

該当しない項目は省略してOK。

# 出力JSON
{
  "name": "...",
  "companyName": "...",
  "role": "...",
  "email": "...",
  "phone": "...",
  "hp": "..."
}`;

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
