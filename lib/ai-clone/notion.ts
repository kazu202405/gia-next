import { Client } from "@notionhq/client";

function getClient(): Client | null {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  return new Client({ auth: token });
}

// 経営コンテキストの全ページを連結して返す
// NOTION_CONTEXT_PAGE_1 〜 NOTION_CONTEXT_PAGE_5 を読み込む
export async function fetchExecutiveContext(): Promise<string> {
  const client = getClient();
  if (!client) return getFallbackContext();

  // 5ページのID取得
  const pageIds = [1, 2, 3, 4, 5]
    .map((n) => process.env[`NOTION_CONTEXT_PAGE_${n}`])
    .filter(Boolean) as string[];

  // 旧フォーマット（親ページ1個）の後方互換
  const legacyParent = process.env.NOTION_CONTEXT_PAGE_ID;
  if (pageIds.length === 0 && legacyParent) {
    return fetchFromParentPage(client, legacyParent);
  }

  if (pageIds.length === 0) return getFallbackContext();

  try {
    const sections = await Promise.all(
      pageIds.map(async (id) => {
        const [title, blocks] = await Promise.all([
          fetchPageTitle(client, id),
          fetchAllBlocks(client, id),
        ]);
        const text = blocksToPlainText(blocks);
        return `# ${title}\n\n${text}`;
      })
    );
    return sections.filter((s) => s.trim().length > 0).join("\n\n---\n\n");
  } catch (err) {
    console.error("[ai-clone] Notion取得失敗:", err);
    return getFallbackContext();
  }
}

// ページタイトル取得
async function fetchPageTitle(client: Client, pageId: string): Promise<string> {
  try {
    const page: any = await client.pages.retrieve({ page_id: pageId });
    // 通常ページは properties.title.title[0].plain_text
    const props = page.properties;
    if (props) {
      for (const key of Object.keys(props)) {
        const prop = props[key];
        if (prop?.type === "title" && Array.isArray(prop.title)) {
          return prop.title.map((t: any) => t.plain_text || "").join("") || "(無題)";
        }
      }
    }
    return "(無題)";
  } catch {
    return "(タイトル取得失敗)";
  }
}

// 親ページ1個から子ページを辿って読む（旧フォーマット互換）
async function fetchFromParentPage(client: Client, parentId: string): Promise<string> {
  try {
    const blocks = await fetchAllBlocks(client, parentId);
    const baseText = blocksToPlainText(blocks);

    const childPageIds = blocks
      .filter((b: any) => b.type === "child_page")
      .map((b: any) => b.id as string);

    const childTexts = await Promise.all(
      childPageIds.map(async (id) => {
        const [title, childBlocks] = await Promise.all([
          fetchPageTitle(client, id),
          fetchAllBlocks(client, id),
        ]);
        const text = blocksToPlainText(childBlocks);
        return `# ${title}\n\n${text}`;
      })
    );

    return [baseText, ...childTexts]
      .filter((s) => s.trim().length > 0)
      .join("\n\n---\n\n");
  } catch (err) {
    console.error("[ai-clone] Notion親ページ取得失敗:", err);
    return getFallbackContext();
  }
}

async function fetchAllBlocks(client: Client, blockId: string): Promise<any[]> {
  const all: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    all.push(...res.results);
    cursor = res.has_more ? res.next_cursor || undefined : undefined;
  } while (cursor);
  return all;
}

function blocksToPlainText(blocks: any[]): string {
  return blocks
    .map((b) => formatBlock(b))
    .filter((s) => s !== null)
    .join("\n");
}

// ブロックタイプごとに整形
function formatBlock(b: any): string | null {
  const type = b.type;
  const data = b[type];

  // rich_text を持つ標準ブロック
  const richText = (data?.rich_text as any[]) || [];
  const text = richText.map((r: any) => r.plain_text || "").join("");

  switch (type) {
    case "heading_1":
      return `\n## ${text}`;
    case "heading_2":
      return `\n### ${text}`;
    case "heading_3":
      return `\n#### ${text}`;
    case "paragraph":
      return text;
    case "bulleted_list_item":
      return `- ${text}`;
    case "numbered_list_item":
      return `1. ${text}`;
    case "to_do":
      return `${data.checked ? "[x]" : "[ ]"} ${text}`;
    case "quote":
      return `> ${text}`;
    case "callout":
      return `💡 ${text}`;
    case "code":
      return `\`\`\`${data.language || ""}\n${text}\n\`\`\``;
    case "toggle":
      return text;
    case "child_page":
      return null; // 別途処理
    case "divider":
      return "\n---\n";
    default:
      // unknown block type with rich_text fallback
      return text || null;
  }
}

// Notion未設定時のフォールバック
function getFallbackContext(): string {
  return `# 経営コンテキスト（フォールバック）

## ミッション
中小企業の現場で人の価値を最大化する仕組みを、行動心理学とAIで実装する。

## 最重要KPI
月収300万円をできるだけ早く達成する。

## 判断基準
- 数字より直感を信じる
- 短期売上より関係性を優先
- 既存メンバーを伸ばす > 人を増やす
- 完璧より結果スピード優先

## やる / やらない
- やる: 「人の行動を動かす」領域
- やらない（看板に）: 議事録ToDo / 予約管理 / 純粋な事務効率化
`;
}
