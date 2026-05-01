import OpenAI from "openai";
import type { CalendarEvent } from "./types";
import { fetchTodayEvents, fetchTomorrowEvents } from "./google";
import { fetchExecutiveContext } from "./notion";
import {
  fetchNotesForDate,
  fetchMeetingsForDate,
  fetchRecentMeetingsForPerson,
  findPersonByEmail,
  searchPeopleByName,
} from "./notion-db";
import { sendEveningBriefing } from "./slack";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export interface EveningBriefingResult {
  date: string; // 今日のJST日付
  generatedAt: string;
  todayEvents: CalendarEvent[];
  todayMeetings: { id: string; title: string; nextActions: string }[];
  todayNotes: {
    id: string;
    title: string;
    kind: string;
    content: string;
    importance: string;
  }[];
  tomorrowItems: {
    event: CalendarEvent;
    pastContext: string; // 関連する過去メモを箇条書き
  }[];
  summary: string;
}

export async function runEveningBriefing(): Promise<{
  result: EveningBriefingResult;
  delivery: { ok: boolean; reason?: string };
}> {
  const todayDate = formatJSTDate(new Date());
  const tomorrowDate = formatJSTDate(addDays(new Date(), 1));

  // 平行取得
  const [
    context,
    todayEvents,
    tomorrowEvents,
    todayNotes,
    todayMeetings,
  ] = await Promise.all([
    fetchExecutiveContext(),
    fetchTodayEvents(),
    fetchTomorrowEvents(),
    fetchNotesForDate(todayDate),
    fetchMeetingsForDate(todayDate),
  ]);

  // 明日の各予定について、過去文脈を集める
  const tomorrowItems = await Promise.all(
    tomorrowEvents.map(async (event) => {
      const pastContext = await collectPastContextForEvent(event);
      return { event, pastContext };
    })
  );

  // AIサマリー
  const summary = await generateEveningSummary(
    {
      todayEvents,
      todayMeetings,
      todayNotes,
      tomorrowItems,
      context,
      tomorrowDate,
    }
  );

  const result: EveningBriefingResult = {
    date: todayDate,
    generatedAt: new Date().toISOString(),
    todayEvents,
    todayMeetings,
    todayNotes,
    tomorrowItems,
    summary,
  };

  const delivery = await sendEveningBriefing(result);
  return { result, delivery };
}

// 明日の予定の参加者から過去履歴をテキストで集める
async function collectPastContextForEvent(
  event: CalendarEvent
): Promise<string> {
  const peopleByEmail = await Promise.all(
    (event.attendees || []).map((a) => findPersonByEmail(a.email))
  );

  const nameCandidates = extractPersonNames(
    event.summary + " " + (event.description || "")
  );
  const nameResults = await Promise.all(
    nameCandidates.map((n) => searchPeopleByName(n))
  );
  const peopleByName = nameResults
    .filter((arr) => arr.length === 1)
    .map((arr) => ({ id: arr[0].id, name: arr[0].name }));

  const matched = [
    ...peopleByEmail.filter(
      (p): p is { id: string; name: string } => p !== null
    ),
    ...peopleByName,
  ];
  const uniq = new Map(matched.map((p) => [p.id, p]));

  if (uniq.size === 0) return "";

  const all = await Promise.all(
    Array.from(uniq.values()).map(async (person) => {
      const recent = await fetchRecentMeetingsForPerson(person.id, 1);
      if (recent.length === 0) return null;
      const m = recent[0];
      return `${person.name}（前回 ${m.date || "?"}：${m.title}${m.nextActions ? ` / 次: ${m.nextActions}` : ""}）`;
    })
  );

  return all
    .filter((s): s is string => !!s)
    .map((s) => `- ${s}`)
    .join("\n");
}

interface SummaryInputs {
  todayEvents: CalendarEvent[];
  todayMeetings: { title: string; nextActions: string }[];
  todayNotes: { kind: string; content: string }[];
  tomorrowItems: { event: CalendarEvent; pastContext: string }[];
  context: string;
  tomorrowDate: string;
}

async function generateEveningSummary(inputs: SummaryInputs): Promise<string> {
  const client = getClient();
  if (!client) {
    return `今日の予定 ${inputs.todayEvents.length}件 / 明日 ${inputs.tomorrowItems.length}件。`;
  }

  const todayList =
    inputs.todayEvents.length === 0
      ? "（予定なし）"
      : inputs.todayEvents
          .map((e) => `- ${formatTime(e.start)} ${e.summary}`)
          .join("\n");

  const todayNoteList =
    inputs.todayNotes.length === 0
      ? "（記録なし）"
      : inputs.todayNotes
          .map((n) => `- [${n.kind}] ${n.content.slice(0, 60)}`)
          .join("\n");

  const tomorrowList =
    inputs.tomorrowItems.length === 0
      ? "（予定なし）"
      : inputs.tomorrowItems
          .map((it) => {
            const t = formatTime(it.event.start);
            const past = it.pastContext ? `\n  ${it.pastContext.replace(/\n/g, "\n  ")}` : "";
            return `- ${t} ${it.event.summary}${past}`;
          })
          .join("\n");

  const prompt = `あなたはユーザーの経営判断を補佐するAI Cloneです。
夜の振り返り＋明日の予習として、簡潔なまとめを書いてください。

# 経営コンテキスト
${inputs.context}

# 今日の予定（実施済み）
${todayList}

# 今日のNotes（議事録/振り返り/備考から自動抽出）
${todayNoteList}

# 明日（${inputs.tomorrowDate}）の予定
${tomorrowList}

# 出力ルール
- 200〜300字
- 「今日のキー」を1〜2文 → 「明日の重点」を1〜2文 → 締めの一言
- 経営コンテキストの判断軸（数字より直感、関係性優先、速度優先）を反映
- 落ち着いた相棒口調、絵文字なし`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
    });
    return res.choices[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("[ai-clone] 夜のサマリー生成失敗:", err);
    return `今日の予定 ${inputs.todayEvents.length}件 / 明日 ${inputs.tomorrowItems.length}件。`;
  }
}

function extractPersonNames(text: string): string[] {
  if (!text) return [];
  const matches = text.matchAll(
    /([一-鿿ぁ-んァ-ヶー]{2,5})(さん|氏|様|社長|代表|部長|役員)/g
  );
  const names = new Set<string>();
  for (const m of matches) {
    if (m[1]) names.add(m[1]);
  }
  return Array.from(names).slice(0, 5);
}

function formatJSTDate(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatTime(iso: string): string {
  if (!iso) return "終日";
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
