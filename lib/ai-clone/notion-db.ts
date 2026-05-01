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

// 名前から People を検索（部分一致、全件返す）
export async function searchPeopleByName(
  name: string
): Promise<Array<{ id: string; name: string; companyHint: string }>> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return [];

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return [];

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "名前",
        title: { contains: name },
      },
      page_size: 10,
    });

    return await Promise.all(
      res.results.map(async (page: any) => {
        const titleProp = page.properties?.["名前"];
        const personName =
          titleProp?.title?.map((t: any) => t.plain_text).join("") || name;

        // 会社名を識別ヒントとして取得（リレーション先のタイトル）
        let companyHint = "";
        const companyProp = page.properties?.["会社"];
        if (companyProp?.relation && companyProp.relation.length > 0) {
          try {
            const companyPage: any = await client.pages.retrieve({
              page_id: companyProp.relation[0].id,
            });
            const cTitle = companyPage.properties?.["会社名"];
            companyHint =
              cTitle?.title?.map((t: any) => t.plain_text).join("") || "";
          } catch {
            // 取得失敗時はヒント省略
          }
        }
        // 役職もヒントに使う
        if (!companyHint) {
          const roleProp = page.properties?.["役職"];
          companyHint =
            roleProp?.rich_text?.map((t: any) => t.plain_text).join("") || "";
        }

        return { id: page.id, name: personName, companyHint };
      })
    );
  } catch (err) {
    console.error("[ai-clone] People検索失敗:", err);
    return [];
  }
}

// 後方互換：先頭1件を返す（briefingの過去履歴取得などで「曖昧時はスキップ」する用途では searchPeopleByName を直接使う）
export async function findPersonByName(name: string): Promise<{
  id: string;
  name: string;
} | null> {
  const all = await searchPeopleByName(name);
  if (all.length === 0) return null;
  const first = all[0];
  return { id: first.id, name: first.name };
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

// People を詳細情報付きで作成（名刺取り込み用）
export async function createPersonDetailed(params: {
  name: string;
  companyId?: string;
  role?: string;
  email?: string;
  phone?: string;
  ocrText?: string;
}): Promise<{ id: string; name: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return null;

  const properties: any = {
    名前: { title: [{ text: { content: params.name } }] },
  };
  if (params.companyId) {
    properties["会社"] = { relation: [{ id: params.companyId }] };
  }
  if (params.role) {
    properties["役職"] = { rich_text: [{ text: { content: params.role } }] };
  }
  if (params.email) {
    properties["メール"] = { email: params.email };
  }
  if (params.phone) {
    properties["電話"] = { phone_number: params.phone };
  }
  if (params.ocrText) {
    properties["名刺OCR"] = {
      rich_text: chunkText(params.ocrText, 1900).map((c) => ({
        text: { content: c },
      })),
    };
  }

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    return { id: res.id, name: params.name };
  } catch (err) {
    console.error("[ai-clone] People詳細作成失敗:", err);
    return null;
  }
}

// メールアドレスで People を検索
export async function findPersonByEmail(
  email: string
): Promise<{ id: string; name: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_PEOPLE;
  if (!client || !dbId) return null;

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return null;

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "メール",
        email: { equals: email },
      },
      page_size: 1,
    });

    const page: any = res.results[0];
    if (!page) return null;

    const titleProp = page.properties?.["名前"];
    const personName =
      titleProp?.title?.map((t: any) => t.plain_text).join("") || email;

    return { id: page.id, name: personName };
  } catch (err) {
    console.error("[ai-clone] PeopleEmail検索失敗:", err);
    return null;
  }
}

// 会社名で Companies を検索
export async function findCompanyByName(
  name: string
): Promise<{ id: string; name: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_COMPANIES;
  if (!client || !dbId) return null;

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return null;

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "会社名",
        title: { contains: name },
      },
      page_size: 1,
    });

    const page: any = res.results[0];
    if (!page) return null;

    const titleProp = page.properties?.["会社名"];
    const companyName =
      titleProp?.title?.map((t: any) => t.plain_text).join("") || name;

    return { id: page.id, name: companyName };
  } catch (err) {
    console.error("[ai-clone] Company検索失敗:", err);
    return null;
  }
}

// Companies 新規作成
export async function createCompany(params: {
  name: string;
  hp?: string;
  industry?: string[];
}): Promise<{ id: string; name: string } | null> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_COMPANIES;
  if (!client || !dbId) return null;

  const properties: any = {
    会社名: { title: [{ text: { content: params.name } }] },
  };
  if (params.hp) {
    properties["HP"] = { url: params.hp };
  }
  if (params.industry && params.industry.length > 0) {
    properties["業種"] = {
      multi_select: params.industry.map((i) => ({ name: i })),
    };
  }

  try {
    const res: any = await client.pages.create({
      parent: { database_id: dbId },
      properties,
    });
    return { id: res.id, name: params.name };
  } catch (err) {
    console.error("[ai-clone] Company作成失敗:", err);
    return null;
  }
}

// Companies find or create
export async function findOrCreateCompany(
  name: string,
  extras?: { hp?: string; industry?: string[] }
): Promise<{ id: string; name: string; created: boolean } | null> {
  const found = await findCompanyByName(name);
  if (found) return { ...found, created: false };
  const created = await createCompany({ name, ...extras });
  if (!created) return null;
  return { ...created, created: true };
}

// People を解決（議事録参加者の自動紐付けに使う）
// - 0件 → 新規作成して single
// - 1件 → そのIDで single
// - 2件以上 → ambiguous（呼び出し側がユーザーに警告して中断）
export type PersonResolution =
  | { state: "single"; id: string; name: string; created: boolean }
  | {
      state: "ambiguous";
      query: string;
      candidates: { id: string; name: string; companyHint: string }[];
    };

export async function resolvePerson(
  name: string
): Promise<PersonResolution | null> {
  const matches = await searchPeopleByName(name);

  if (matches.length === 0) {
    const created = await createPerson(name);
    if (!created) return null;
    return { state: "single", id: created.id, name: created.name, created: true };
  }

  if (matches.length === 1) {
    return {
      state: "single",
      id: matches[0].id,
      name: matches[0].name,
      created: false,
    };
  }

  return { state: "ambiguous", query: name, candidates: matches };
}

// 旧API（互換のため残すが、議事録モードでは resolvePerson を使う）
export async function findOrCreatePerson(
  name: string
): Promise<{ id: string; name: string; created: boolean } | null> {
  const r = await resolvePerson(name);
  if (!r) return null;
  if (r.state === "ambiguous") return null; // 曖昧時は呼び出し側で対応すべき
  return { id: r.id, name: r.name, created: r.created };
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

// 指定日に作成された Notes を取得（夜のブリーフィング用）
export async function fetchNotesForDate(date: string): Promise<
  {
    id: string;
    title: string;
    kind: string;
    content: string;
    importance: string;
  }[]
> {
  const client = getClient();
  const dbId = process.env.NOTION_DB_NOTES;
  if (!client || !dbId) return [];

  const dsId = await getDataSourceId(client, dbId);
  if (!dsId) return [];

  try {
    const res = await client.dataSources.query({
      data_source_id: dsId,
      filter: {
        property: "日付",
        date: { equals: date },
      },
      page_size: 50,
    });

    return res.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractText(props["タイトル"]?.title || []),
        kind: props["種別"]?.select?.name || "",
        content: extractText(props["内容"]?.rich_text || []),
        importance: props["重要度"]?.select?.name || "",
      };
    });
  } catch (err) {
    console.error("[ai-clone] 指定日Notes取得失敗:", err);
    return [];
  }
}

// 指定日に開催した Meetings を取得（夜のブリーフィング用）
export async function fetchMeetingsForDate(date: string): Promise<
  {
    id: string;
    title: string;
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
        property: "日時",
        date: { equals: date },
      },
      page_size: 20,
    });

    return res.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        title: extractText(props["タイトル"]?.title || []),
        nextActions: extractText(props["ネクストアクション"]?.rich_text || []),
      };
    });
  } catch (err) {
    console.error("[ai-clone] 指定日Meetings取得失敗:", err);
    return [];
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
