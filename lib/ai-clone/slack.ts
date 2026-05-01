import { WebClient } from "@slack/web-api";
import crypto from "crypto";
import type { BriefingResult } from "./types";
import type { EveningBriefingResult } from "./briefing";

function getClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new WebClient(token);
}

// Slackからのリクエスト署名を検証（タイミング攻撃対策込み）
export function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  // 5分以上古いリクエストは弾く（リプレイ攻撃対策）
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts) || Math.abs(now - ts) > 60 * 5) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(baseString)
      .digest("hex");

  // タイミング攻撃対策の比較
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf-8"),
      Buffer.from(signature, "utf-8")
    );
  } catch {
    return false;
  }
}

// 夜のブリーフィング送信
export async function sendEveningBriefing(
  result: EveningBriefingResult
): Promise<{ ok: boolean; reason?: string }> {
  const client = getClient();
  const userId = process.env.SLACK_CEO_USER_ID;
  if (!client || !userId) {
    return {
      ok: false,
      reason: "SLACK_BOT_TOKEN または SLACK_CEO_USER_ID 未設定",
    };
  }

  const blocks = buildEveningBlocks(result);
  try {
    await client.chat.postMessage({
      channel: userId,
      text: `🌙 今日の振り返りと明日の予習（${result.date}）`,
      blocks,
    });
    return { ok: true };
  } catch (err) {
    console.error("[ai-clone] 夜のブリーフィング送信失敗:", err);
    return { ok: false, reason: String(err) };
  }
}

function buildEveningBlocks(result: EveningBriefingResult) {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🌙 今日の振り返りと明日の予習 ${result.date}`,
      },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: result.summary || "（要約なし）" },
    },
    { type: "divider" },
  ];

  // 今日あったこと
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: "📅 今日の予定" },
  });
  if (result.todayEvents.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "（予定なし）" },
    });
  } else {
    const lines = result.todayEvents
      .map((e) => `• ${formatTimeJST(e.start)} ${e.summary}`)
      .join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: lines },
    });
  }

  // 今日記録された Notes
  if (result.todayNotes.length > 0) {
    const grouped: Record<string, string[]> = {};
    for (const n of result.todayNotes) {
      const k = n.kind || "Other";
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(n.content.slice(0, 80));
    }
    const noteLines = Object.entries(grouped)
      .map(
        ([kind, items]) =>
          `*${kind}* (${items.length})\n${items.map((i) => `• ${i}`).join("\n")}`
      )
      .join("\n\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `📝 *今日のNotes*\n${noteLines}` },
    });
  }

  blocks.push({ type: "divider" });

  // 明日の予定
  blocks.push({
    type: "header",
    text: { type: "plain_text", text: "🌅 明日の予定" },
  });
  if (result.tomorrowItems.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "（明日の予定なし 🌴）" },
    });
  } else {
    for (const it of result.tomorrowItems) {
      const t = formatTimeJST(it.event.start);
      const text = [
        `*${t}  ${it.event.summary}*`,
        it.pastContext ? `${it.pastContext}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text },
      });
    }
  }

  return blocks;
}

function formatTimeJST(iso: string): string {
  if (!iso) return "終日";
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// 任意のチャンネル/ユーザーへ返信（DMでもパブリックでも可）
export async function postReply(
  channel: string,
  text: string
): Promise<{ ok: boolean; reason?: string }> {
  const client = getClient();
  if (!client) return { ok: false, reason: "SLACK_BOT_TOKEN 未設定" };

  try {
    await client.chat.postMessage({ channel, text });
    return { ok: true };
  } catch (err) {
    console.error("[ai-clone] Slack返信失敗:", err);
    return { ok: false, reason: String(err) };
  }
}

// Slack DMにブリーフィングを送信
export async function sendBriefing(result: BriefingResult): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const client = getClient();
  const userId = process.env.SLACK_CEO_USER_ID;
  if (!client || !userId) {
    return { ok: false, reason: "SLACK_BOT_TOKEN または SLACK_CEO_USER_ID 未設定" };
  }

  const blocks = buildBlocks(result);

  try {
    await client.chat.postMessage({
      channel: userId, // user IDを渡すとSlackが自動でDMチャンネルに送ってくれる
      text: `🌅 朝のブリーフィング（${result.date}）`,
      blocks,
    });
    return { ok: true };
  } catch (err) {
    console.error("[ai-clone] Slack送信失敗:", err);
    return { ok: false, reason: String(err) };
  }
}

// Slack Block Kit でリッチに表示
function buildBlocks(result: BriefingResult) {
  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `🌅 朝のブリーフィング ${result.date}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: result.summary || "（要約なし）" },
    },
    { type: "divider" },
  ];

  if (result.items.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "今日は予定がありません 🌴" },
    });
    return blocks;
  }

  for (const item of result.items) {
    const time = formatTime(item.event.start);
    const statusIcon =
      item.status === "ready" ? "✅" : item.status === "missing" ? "⚠️" : "🟡";
    const docList =
      item.relatedDocs.length > 0
        ? item.relatedDocs
            .map((d) => `• <${d.url}|${d.name}>`)
            .join("\n")
        : "（関連資料なし）";

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `${statusIcon} *${time}  ${item.event.summary}*`,
          item.reason ? `_${item.reason}_` : "",
          `${docList}`,
          item.recommendedAction ? `→ ${item.recommendedAction}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });
  }

  return blocks;
}

function formatTime(iso: string): string {
  if (!iso) return "終日";
  const d = new Date(iso);
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
