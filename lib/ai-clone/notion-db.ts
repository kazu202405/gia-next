import { Client } from "@notionhq/client";

function getClient(): Client | null {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  return new Client({ auth: token });
}

// Notion v5 API: databases.query は廃止、dataSources.query になった
// database_id → primary data_source_id を引く（モジュール内でキャッシュ）
const dataSourceCache = new Map<string, string>();

async function getDataSourceId(
  client: Client,
  databaseId: string
): Promise<string | null> {
  const cached = dataSourceCache.get(databaseId);
  if (cached) return cached;

  try {
    const db: any = await client.databases.retrieve({
      database_id: databaseId,
    });
    const id = db.data_sources?.[0]?.id || null;
    if (id) dataSourceCache.set(databaseId, id);
    return id;
  } catch (err) {
    console.error("[ai-clone] data_source_id取得失敗:", err);
    return null;
  }
}

// 名前から People を検索（部分一致）
export async function findPersonByName(name: string): Promise<{
  id: string;
  name: string;
} | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return null;

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return null;

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "名前",
        title: { contains: name },
      },
      page_size: 1,
    });

    const page: any = res.results[0];
    if (!page) return null;

    const titleProp = page.properties?.["名前"];
    const personName =
      titleProp?.title?.map((t: any) => t.plain_text).join("") || name;

    return { id: page.id, name: personName };
  } catch (err) {
    console.error("[ai-clone] People検索失敗:", err);
    return null;
  }
}

// People新規作成（名前のみ最低限）
export async function createPerson(name: string): Promise<{
  id: string;
  name: string;
} | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return null;

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties: {
        名前: { title: [{ text: { content: name } }] },
      },
    });
    return { id: res.id, name };
  } catch (err) {
    console.error("[ai-clone] People作成失敗:", err);
    return null;
  }
}

// People を find or create（議事録参加者の自動紐付けに使う）
export async function findOrCreatePerson(
  name: string
): Promise<{ id: string; name: string; created: boolean } | null> {
  const found = await findPersonByName(name);
  if (found) return { ...found, created: false };
  const created = await createPerson(name);
  if (!created) return null;
  return { ...created, created: true };
}

// Meetings 新規作成
export async function createMeeting(params: {
  title: string;
  date?: string; // YYYY-MM-DD
  participantIds: string[]; // People IDs
  agenda?: string;
  minutes?: string; // 議事録本文
  nextActions?: string;
  rating?: "S" | "A" | "B" | "C";
}): Promise<{ id: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_MEETINGS;
  if (!client || !dbId) return null;

  const properties: any = {
    タイトル: { title: [{ text: { content: params.title } }] },
  };

  if (params.date) {
    properties["日時"] = { date: { start: params.date } };
  }
  if (params.participantIds.length > 0) {
    properties["参加者"] = {
      relation: params.participantIds.map((id) => ({ id })),
    };
  }
  if (params.agenda) {
    properties["議題"] = { rich_text: [{ text: { content: params.agenda } }] };
  }
  if (params.minutes) {
    // Notion rich_text は2000字制限があるので分割
    properties["議事録"] = {
      rich_text: chunkText(params.minutes, 1900).map((c) => ({
        text: { content: c },
      })),
    };
  }
  if (params.nextActions) {
    properties["ネクストアクション"] = {
      rich_text: [{ text: { content: params.nextActions } }],
    };
  }
  if (params.rating) {
    properties["評価"] = { select: { name: params.rating } };
  }

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    return { id: res.id };
  } catch (err) {
    console.error("[ai-clone] Meeting作成失敗:", err);
    return null;
  }
}

// Notes 新規作成（Decision / Hypothesis / Action / Learning / Event）
export async function createNote(params: {
  title: string;
  date?: string;
  kind: "Decision" | "Hypothesis" | "Action" | "Learning" | "Event";
  content: string;
  peopleIds?: string[];
  companyIds?: string[];
  importance?: "S" | "A" | "B" | "C";
}): Promise<{ id: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_NOTES;
  if (!client || !dbId) return null;

  const properties: any = {
    タイトル: { title: [{ text: { content: params.title } }] },
    種別: { select: { name: params.kind } },
    内容: {
      rich_text: chunkText(params.content, 1900).map((c) => ({
        text: { content: c },
      })),
    },
  };

  if (params.date) {
    properties["日付"] = { date: { start: params.date } };
  }
  if (params.peopleIds && params.peopleIds.length > 0) {
    properties["関連人物"] = {
      relation: params.peopleIds.map((id) => ({ id })),
    };
  }
  if (params.companyIds && params.companyIds.length > 0) {
    properties["関連会社"] = {
      relation: params.companyIds.map((id) => ({ id })),
    };
  }
  if (params.importance) {
    properties["重要度"] = { select: { name: params.importance } };
  }

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    return { id: res.id };
  } catch (err) {
    console.error("[ai-clone] Note作成失敗:", err);
    return null;
  }
}

// 直近のMeetings を取得（朝のブリーフィング強化用）
export async function fetchRecentMeetingsForPerson(
  personId: string,
  limit: number = 3
): Promise<
  {
    id: string;
    title: string;
    date: string;
    minutes: string;
    nextActions: string;
  }[]
> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_MEETINGS;
  if (!client || !dbId) return [];

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return [];

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "参加者",
        relation: { contains: personId },
      },
      sorts: [{ property: "日時", direction: "descending" }],
      page_size: limit,
    });

    return res.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractText(props["タイトル"]?.title || []),
        date: props["日時"]?.date?.start || "",
        minutes: extractText(props["議事録"]?.rich_text || []),
        nextActions: extractText(props["ネクストアクション"]?.rich_text || []),
      };
    });
  } catch (err) {
    console.error("[ai-clone] 過去Meetings取得失敗:", err);
    return [];
  }
}

// ----- ヘルパー -----

function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += max) {
    chunks.push(text.slice(i, i + max));
  }
  return chunks;
}

function extractText(richText: any[]): string {
  return richText.map((r: any) => r.plain_text || "").join("");
}
