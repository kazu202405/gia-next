import type { BriefingItem, BriefingResult } from "./types";
import { fetchTodayEvents, searchRelatedDocs } from "./google";
import { judgeEventReadiness, summarizeBriefing } from "./openai";
import { fetchExecutiveContext } from "./notion";
import { sendBriefing } from "./slack";

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

  // 3. 各予定について関連Docs検索 + AIで判定
  const items: BriefingItem[] = [];
  for (const event of events) {
    const docs = await searchRelatedDocs(event);
    const judgement = await judgeEventReadiness(event, docs, context);
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

function formatJSTDate(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
