import type { BriefingItem, BriefingResult, CalendarEvent } from "./types";
import { fetchTodayEvents, searchRelatedDocs } from "./google";
import {
  judgeEventReadiness,
  summarizeBriefing,
  type PastMeeting,
} from "./openai";
import { fetchExecutiveContext } from "./notion";
import { sendBriefing } from "./slack";
import {
  findPersonByEmail,
  findPersonByName,
  fetchRecentMeetingsForPerson,
} from "./notion-db";

// Phase 1 メイン：朝のブリーフィングを生成して Slack DM へ送信
export async function runMorningBriefing(): Promise<{
  result: BriefingResult;
  delivery: { ok: boolean; reason?: string };
}> {
  const today = formatJSTDate(new Date());

  // 1. 経営コンテキスト読み込み（Notion → なければフォールバック）
  const context = await fetchExecutiveContext();

  // 2. 今日のカレンダー予定取得
  const events = await fetchTodayEvents();

  // 3. 各予定について：関連Docs + 過去履歴 + AI判定
  const items: BriefingItem[] = [];
  for (const event of events) {
    const [docs, pastMeetings] = await Promise.all([
      searchRelatedDocs(event),
      fetchPastMeetingsForEvent(event),
    ]);
    const judgement = await judgeEventReadiness(
      event,
      docs,
      context,
      pastMeetings
    );
    items.push({
      event,
      relatedDocs: docs,
      ...judgement,
    });
  }

  // 4. 全体サマリー生成
  const summary = await summarizeBriefing(items, context);

  const result: BriefingResult = {
    date: today,
    generatedAt: new Date().toISOString(),
    items,
    summary,
  };

  // 5. Slackへ送信
  const delivery = await sendBriefing(result);

  return { result, delivery };
}

// イベントの参加者から People を逆引き → 過去履歴を集める
async function fetchPastMeetingsForEvent(
  event: CalendarEvent
): Promise<PastMeeting[]> {
  // Step 1: 参加者を People に対して逆引き
  // (a) attendees のメールから検索
  const peopleByEmail = await Promise.all(
    (event.attendees || []).map((a) => findPersonByEmail(a.email))
  );

  // (b) summary から日本語の人名（さん/氏/様付き）を抽出して検索
  const nameCandidates = extractPersonNames(
    event.summary + " " + (event.description || "")
  );
  const peopleByName = await Promise.all(
    nameCandidates.map((n) => findPersonByName(n))
  );

  const matchedPeople = [...peopleByEmail, ...peopleByName].filter(
    (p): p is { id: string; name: string } => p !== null
  );

  // 重複排除
  const uniqueIds = new Set<string>();
  const uniquePeople = matchedPeople.filter((p) => {
    if (uniqueIds.has(p.id)) return false;
    uniqueIds.add(p.id);
    return true;
  });

  if (uniquePeople.length === 0) return [];

  // Step 2: 各人物の直近Meetings（最大2件）を取得
  const all = await Promise.all(
    uniquePeople.map(async (person) => {
      const recent = await fetchRecentMeetingsForPerson(person.id, 2);
      return recent.map((m) => ({
        personName: person.name,
        title: m.title,
        date: m.date,
        nextActions: m.nextActions,
      }));
    })
  );

  return all.flat();
}

// テキストから「○○さん」「○○氏」「○○様」等の名前を抽出
function extractPersonNames(text: string): string[] {
  if (!text) return [];
  const matches = text.matchAll(
    /([一-鿿ぁ-んァ-ヶー]{2,5})(さん|氏|様|社長|代表|部長|役員)/g
  );
  const names = new Set<string>();
  for (const m of matches) {
    if (m[1]) names.add(m[1]);
  }
  return Array.from(names).slice(0, 5); // 1イベントあたり上限5名
}

function formatJSTDate(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
