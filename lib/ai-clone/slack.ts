import { WebClient } from "@slack/web-api";
import type { BriefingResult } from "./types";

function getClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new WebClient(token);
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
