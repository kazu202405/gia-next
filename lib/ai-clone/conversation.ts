import OpenAI from "openai";
import { fetchExecutiveContext } from "./notion";
import { fetchTodayEvents } from "./google";
import {
  resolvePerson,
  createMeeting,
  createNote,
  findOrCreateCompany,
  createPersonDetailed,
  findPersonByEmail,
  findMeetingByApproxTitleAndDate,
  appendMeetingMinutes,
  updatePersonPipeline,
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

  const intent = await classifyIntent(client, userMessage);

  switch (intent) {
    case "help":
      return handleHelp();
    case "transcript":
      return await handleTranscript(client, userMessage);
    case "businessCard":
      return await handleBusinessCard(client, userMessage);
    case "reflection":
      return await handleReflection(client, userMessage);
    case "remark":
      return await handleRemark(client, userMessage);
    case "pipelineUpdate":
      return await handlePipelineUpdate(client, userMessage);
    default:
      return await handleQuery(client, userMessage);
  }
}

// =============================================
// 意図分類
// =============================================

type Intent =
  | "help"
  | "transcript"
  | "businessCard"
  | "reflection"
  | "remark"
  | "pipelineUpdate"
  | "query";

async function classifyIntent(client: OpenAI, text: string): Promise<Intent> {
  const trimmed = text.trim();

  if (trimmed.length < 1) return "query";

  // ヘルプ系（短文一致）
  if (/^(\?|？|help|ヘルプ|コマンド|使い方)$/i.test(trimmed)) return "help";

  // 明示プレフィックス（最優先）
  if (/^(議事録|面談|memo|meeting)[:：\s]/i.test(trimmed)) return "transcript";
  if (/^(名刺|business[\s-]?card|card)[:：\s]/i.test(trimmed))
    return "businessCard";
  if (/^(振り返り|日報|日誌|reflection)[:：\s]/i.test(trimmed))
    return "reflection";
  if (/^(備考|人物メモ|note)[:：\s]/i.test(trimmed)) return "remark";
  if (/^(進捗|ファネル|pipeline)[:：\s]/i.test(trimmed))
    return "pipelineUpdate";

  // 自然文でのファネル更新（プレフィックスなし）
  // 「〇〇さんに/がサロン提案/参加/入会/商談/受注」等のパターン
  if (
    /(さん|氏|様)[にがへ]?(.{0,10}(サロン|アプリ).{0,5}(提案|参加|入会|商談|受注|契約)|提案した|参加した|入会した|商談した|受注した)/.test(
      trimmed
    )
  ) {
    return "pipelineUpdate";
  }

  // 短いメッセージは会話扱い
  if (trimmed.length < 25) return "query";

  // AI fallback（曖昧な長文）
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `次のテキストを分類してください。JSON: { "intent": "transcript" | "businessCard" | "reflection" | "remark" | "pipelineUpdate" | "query" }

- transcript: 会議の議事録・面談記録（参加者と話した内容、決定、ToDoが含まれる）
- businessCard: 名刺の文字情報（氏名・会社・役職・メール・電話の羅列）
- reflection: 1日や数日の振り返り・日報・気づきまとめ
- remark: 特定人物への短い気づき・観察メモ（「○○さんは〜」型の1〜2文）
- pipelineUpdate: 営業ファネルの状態更新（「〇〇さんにサロン提案した」「〇〇さんがアプリ受注した 30万」等の短文・状態通知）
- query: 質問・相談・依頼・雑談`,
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_tokens: 50,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const valid: Intent[] = [
      "transcript",
      "businessCard",
      "reflection",
      "remark",
      "pipelineUpdate",
      "query",
    ];
    return valid.includes(parsed.intent) ? parsed.intent : "query";
  } catch {
    return "query";
  }
}

// =============================================
// ヘルプ
// =============================================

function handleHelp(): string {
  return `利用できるコマンド：

📝 議事録: → 会議の議事録を保存
   例: 議事録: 山口さんとの面談
       [内容]
   ※ 複数会議を1メッセージにまとめて投げてもOK
     （# タイトル ヘッダーで分割）

🎴 名刺: → 名刺をPeopleに登録
   例: 名刺: 山田太郎 株式会社ABC 03-1234-5678

💭 振り返り: → 日々の振り返り（学び・気づき・アクション）を保存
   例: 振り返り:
       ## 2026-05-01
       [今日の気づき]
   ※ 複数日まとめてもOK（## YYYY-MM-DD ヘッダー）

📌 備考: → 人物メモ・短い気づきを残す
   例: 備考: 田中さん 新規より既存に愛着強い
   ※ 中身に名前があれば自動で人物に紐づけ

📈 ファネル更新: → 営業の状態を更新（プレフィックス不要）
   例: 山口さんにサロン提案した
       田中さんがアプリ受注した 30万
       鈴木さん商談した
   ※ 提案/参加/商談/受注 を検知して People の日付列を更新

❓ ヘルプ：このコマンド一覧を表示
   例: ヘルプ / ? / コマンド

その他のメッセージはそのまま質問・相談として答えます。`;
}

// =============================================
// 会話モード
// =============================================

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

// =============================================
// 議事録モード（複数会議対応）
// =============================================

interface MeetingItem {
  meetingTitle: string;
  date?: string;
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
  const meetings = await extractMeetings(client, text);
  if (!meetings || meetings.length === 0) {
    return "議事録として保存しようとしましたが、内容の抽出に失敗しました。";
  }

  // 全会議の参加者を一括解決して、曖昧があれば事前にまとめて警告
  const allNames = Array.from(
    new Set(meetings.flatMap((m) => m.participants.map((p) => p.name)))
  );
  const resolutions = await Promise.all(
    allNames.map(async (n) => ({ name: n, result: await resolvePerson(n) }))
  );
  const ambiguous = resolutions.filter(
    (r) => r.result?.state === "ambiguous"
  );
  if (ambiguous.length > 0) {
    return buildAmbiguousWarning(
      ambiguous.map((a) => ({
        query: a.name,
        candidates:
          a.result?.state === "ambiguous" ? a.result.candidates : [],
      }))
    );
  }

  // name → personId マップ作成
  const nameToId = new Map<string, { id: string; name: string; created: boolean }>();
  for (const r of resolutions) {
    if (r.result?.state === "single") {
      nameToId.set(r.name, {
        id: r.result.id,
        name: r.result.name,
        created: r.result.created,
      });
    }
  }

  // 各会議を保存
  const reports: string[] = [];
  for (const m of meetings) {
    const peopleIds = m.participants
      .map((p) => nameToId.get(p.name)?.id)
      .filter((id): id is string => !!id);

    const meetingDate = m.date || todayJST();

    // 同じ日にカレンダー由来の骨組み Meeting がいれば追記、無ければ新規作成
    const existingShell = await findMeetingByApproxTitleAndDate(
      m.meetingTitle,
      meetingDate
    );
    let meetingId: string | null = null;
    let appendedToShell = false;
    if (existingShell) {
      const ok = await appendMeetingMinutes(existingShell.id, {
        agenda: m.agenda,
        minutes: text,
        nextActions: m.nextActions,
        addParticipantIds: peopleIds,
      });
      if (ok) {
        meetingId = existingShell.id;
        appendedToShell = true;
      }
    }
    if (!meetingId) {
      const created = await createMeeting({
        title: m.meetingTitle,
        date: meetingDate,
        participantIds: peopleIds,
        agenda: m.agenda,
        minutes: text, // 全文。複数会議でも同じ全文で保存（前後文脈含めて参照可）
        nextActions: m.nextActions,
      });
      meetingId = created?.id || null;
    }
    const meeting = meetingId ? { id: meetingId } : null;

    const noteJobs: Promise<any>[] = [];
    const pushNotes = (
      kind: "Decision" | "Hypothesis" | "Action" | "Learning" | "Event",
      items: { content: string }[]
    ) => {
      for (const item of items) {
        noteJobs.push(
          createNote({
            title: item.content.slice(0, 60),
            date: m.date || todayJST(),
            kind,
            content: item.content,
            peopleIds,
          })
        );
      }
    };
    pushNotes("Decision", m.decisions);
    pushNotes("Hypothesis", m.hypotheses);
    pushNotes("Action", m.actions);
    pushNotes("Learning", m.learnings);
    pushNotes("Event", m.events);
    await Promise.all(noteJobs);

    const noteCount =
      m.decisions.length +
      m.hypotheses.length +
      m.actions.length +
      m.learnings.length +
      m.events.length;

    const participantNames = m.participants
      .map((p) => nameToId.get(p.name)?.name || p.name)
      .join(", ");
    const newlyCreatedNames = m.participants
      .map((p) => nameToId.get(p.name))
      .filter((p) => p?.created)
      .map((p) => p!.name);

    const lines: string[] = [];
    lines.push(`✅「${m.meetingTitle}」`);
    const meetingStatus = meeting?.id
      ? appendedToShell
        ? "1件（カレンダー骨組みに追記）"
        : "1件（新規）"
      : "失敗";
    lines.push(`  Meetings: ${meetingStatus} / Notes: ${noteCount}件`);
    if (participantNames) lines.push(`  参加者: ${participantNames}`);
    if (newlyCreatedNames.length > 0) {
      lines.push(`    ↳ 新規作成: ${newlyCreatedNames.join(", ")}`);
    }
    if (m.nextActions) {
      lines.push(`  📌 次: ${m.nextActions}`);
    }
    reports.push(lines.join("\n"));
  }

  return `議事録を保存しました（${meetings.length}件）：\n\n${reports.join("\n\n")}`;
}

async function extractMeetings(
  client: OpenAI,
  text: string
): Promise<MeetingItem[] | null> {
  const prompt = `以下の議事録から、会議ごとに分割して構造化抽出してください。
1メッセージに複数会議が含まれる場合があります（# タイトル等で区切られる）。
1会議だけなら配列に1要素入れてください。

# 議事録
${text}

# 出力JSON
{
  "meetings": [
    {
      "meetingTitle": "会議のタイトル（明示なければ参加者名や論点から命名）",
      "date": "YYYY-MM-DD or null",
      "participants": [{ "name": "氏名（自分は含めない）" }],
      "agenda": "議題1〜2行 or null",
      "summary": "要点を1段落",
      "nextActions": "ToDoの連結 or null",
      "decisions": [{ "content": "決定事項" }],
      "hypotheses": [{ "content": "仮説・検討中アイデア" }],
      "actions": [{ "content": "個別ToDo・依頼" }],
      "learnings": [{ "content": "学び・気づき" }],
      "events": [{ "content": "起きた事実・接触履歴" }]
    }
  ]
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!Array.isArray(parsed.meetings)) return null;
    return parsed.meetings.map((m: any) => normalizeMeetingItem(m));
  } catch (err) {
    console.error("[ai-clone] 議事録抽出失敗:", err);
    return null;
  }
}

function normalizeMeetingItem(m: any): MeetingItem {
  return {
    meetingTitle: m.meetingTitle || "（タイトル未抽出）",
    date: m.date || undefined,
    participants: Array.isArray(m.participants)
      ? m.participants.filter((p: any) => p?.name)
      : [],
    agenda: m.agenda || undefined,
    summary: m.summary || "",
    nextActions: m.nextActions || undefined,
    decisions: ensureContentArray(m.decisions),
    hypotheses: ensureContentArray(m.hypotheses),
    actions: ensureContentArray(m.actions),
    learnings: ensureContentArray(m.learnings),
    events: ensureContentArray(m.events),
  };
}

// =============================================
// 振り返りモード（複数日対応）
// =============================================

interface ReflectionItem {
  date: string; // YYYY-MM-DD
  summary: string;
  decisions: { content: string }[];
  hypotheses: { content: string }[];
  actions: { content: string }[];
  learnings: { content: string }[];
  events: { content: string }[];
}

async function handleReflection(
  client: OpenAI,
  text: string
): Promise<string> {
  const reflections = await extractReflections(client, text);
  if (!reflections || reflections.length === 0) {
    return "振り返りとして抽出できませんでした。";
  }

  const reports: string[] = [];
  for (const r of reflections) {
    const noteJobs: Promise<any>[] = [];
    const pushNotes = (
      kind: "Decision" | "Hypothesis" | "Action" | "Learning" | "Event",
      items: { content: string }[]
    ) => {
      for (const item of items) {
        noteJobs.push(
          createNote({
            title: `[${r.date}] ${item.content.slice(0, 50)}`,
            date: r.date,
            kind,
            content: item.content,
          })
        );
      }
    };
    pushNotes("Decision", r.decisions);
    pushNotes("Hypothesis", r.hypotheses);
    pushNotes("Action", r.actions);
    pushNotes("Learning", r.learnings);
    pushNotes("Event", r.events);
    await Promise.all(noteJobs);

    const total =
      r.decisions.length +
      r.hypotheses.length +
      r.actions.length +
      r.learnings.length +
      r.events.length;

    reports.push(`📅 ${r.date}：Notes ${total}件`);
  }

  return `振り返りを保存しました（${reflections.length}日分）：\n${reports.join("\n")}`;
}

async function extractReflections(
  client: OpenAI,
  text: string
): Promise<ReflectionItem[] | null> {
  const prompt = `以下の振り返りテキストから、日付ごとに分割して構造化抽出してください。
1日分でも複数日分でも、配列で返してください。日付の指定がなければ今日の日付（${todayJST()}）を使ってください。

# 振り返り
${text}

# 出力JSON
{
  "reflections": [
    {
      "date": "YYYY-MM-DD",
      "summary": "1段落の要約",
      "decisions": [{ "content": "意思決定" }],
      "hypotheses": [{ "content": "仮説・気づき" }],
      "actions": [{ "content": "明日以降のアクション" }],
      "learnings": [{ "content": "学び" }],
      "events": [{ "content": "起きた事実" }]
    }
  ]
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!Array.isArray(parsed.reflections)) return null;
    return parsed.reflections.map((r: any) => ({
      date: r.date || todayJST(),
      summary: r.summary || "",
      decisions: ensureContentArray(r.decisions),
      hypotheses: ensureContentArray(r.hypotheses),
      actions: ensureContentArray(r.actions),
      learnings: ensureContentArray(r.learnings),
      events: ensureContentArray(r.events),
    }));
  } catch (err) {
    console.error("[ai-clone] 振り返り抽出失敗:", err);
    return null;
  }
}

// =============================================
// 備考モード（人物紐付けメモ）
// =============================================

interface RemarkExtraction {
  title: string;
  content: string;
  peopleNames: string[];
  kind: "Learning" | "Hypothesis" | "Event"; // 内容によってAIが選ぶ
}

async function handleRemark(client: OpenAI, text: string): Promise<string> {
  const remark = await extractRemark(client, text);
  if (!remark) {
    return "備考として保存できませんでした。";
  }

  // 人物の解決（曖昧時は警告）
  const resolutions = await Promise.all(
    remark.peopleNames.map(async (n) => ({
      name: n,
      result: await resolvePerson(n),
    }))
  );
  const ambiguous = resolutions.filter(
    (r) => r.result?.state === "ambiguous"
  );
  if (ambiguous.length > 0) {
    return buildAmbiguousWarning(
      ambiguous.map((a) => ({
        query: a.name,
        candidates:
          a.result?.state === "ambiguous" ? a.result.candidates : [],
      }))
    );
  }

  const validPeople = resolutions
    .filter((r) => r.result?.state === "single")
    .map((r) => {
      const single = r.result as Extract<
        NonNullable<typeof r.result>,
        { state: "single" }
      >;
      return { id: single.id, name: single.name, created: single.created };
    });

  const note = await createNote({
    title: remark.title.slice(0, 60),
    date: todayJST(),
    kind: remark.kind,
    content: remark.content,
    peopleIds: validPeople.map((p) => p.id),
  });

  const lines: string[] = [];
  if (note?.id) {
    lines.push(`✅ 備考を保存しました（${remark.kind}）`);
    if (validPeople.length > 0) {
      lines.push(`紐付け: ${validPeople.map((p) => p.name).join(", ")}`);
      const newOnes = validPeople.filter((p) => p.created).map((p) => p.name);
      if (newOnes.length > 0) {
        lines.push(`  ↳ 新規作成: ${newOnes.join(", ")}`);
      }
    } else {
      lines.push("（人物紐付けなし、独立メモとして保存）");
    }
  } else {
    lines.push("備考の保存に失敗しました。");
  }
  return lines.join("\n");
}

async function extractRemark(
  client: OpenAI,
  text: string
): Promise<RemarkExtraction | null> {
  const prompt = `以下のメモから構造化抽出してください。

# メモ
${text}

# 抽出ルール
- title: 1行のタイトル（メモの要点を10〜30字）
- content: 元のメモから「備考:」プレフィックスを除いたテキスト
- peopleNames: 中身で言及されてる人物名（さん/氏/様抜き、なければ空配列）
- kind: 内容に応じて選ぶ
   - "Learning": 一般的な気づき・観察
   - "Hypothesis": 仮説・推測
   - "Event": 起きた事実・接触履歴

# 出力JSON
{
  "title": "...",
  "content": "...",
  "peopleNames": ["..."],
  "kind": "Learning" | "Hypothesis" | "Event"
}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    const validKinds = ["Learning", "Hypothesis", "Event"];
    return {
      title: parsed.title || text.slice(0, 30),
      content: parsed.content || text,
      peopleNames: Array.isArray(parsed.peopleNames)
        ? parsed.peopleNames.filter((n: any) => typeof n === "string")
        : [],
      kind: validKinds.includes(parsed.kind) ? parsed.kind : "Learning",
    };
  } catch (err) {
    console.error("[ai-clone] 備考抽出失敗:", err);
    return null;
  }
}

// =============================================
// ファネル更新モード（People の date 列を更新）
// =============================================

interface PipelineExtraction {
  personName: string;
  stage: "salonProposal" | "salonJoin" | "appPitch" | "appDeal";
  date: string; // YYYY-MM-DD
  amount?: number; // 受注時の金額（円単位）
}

async function handlePipelineUpdate(
  client: OpenAI,
  text: string
): Promise<string> {
  const ext = await extractPipelineUpdate(client, text);
  if (!ext) {
    return "ファネル更新として解釈できませんでした。例: 「山口さんにサロン提案した」「田中さんがアプリ受注した 30万」";
  }

  // 人物解決（曖昧時は警告）
  const r = await resolvePerson(ext.personName);
  if (!r) {
    return `人物「${ext.personName}」を解決できませんでした。`;
  }
  if (r.state === "ambiguous") {
    return buildAmbiguousWarning([
      { query: ext.personName, candidates: r.candidates },
    ]);
  }

  const updateParams: Parameters<typeof updatePersonPipeline>[1] = {};
  let stageLabel = "";
  switch (ext.stage) {
    case "salonProposal":
      updateParams.salonProposalDate = ext.date;
      stageLabel = "サロン提案";
      break;
    case "salonJoin":
      updateParams.salonJoinDate = ext.date;
      stageLabel = "サロン参加";
      break;
    case "appPitch":
      updateParams.appPitchDate = ext.date;
      stageLabel = "アプリ商談";
      break;
    case "appDeal":
      updateParams.appDealDate = ext.date;
      stageLabel = "アプリ受注";
      if (typeof ext.amount === "number") {
        updateParams.dealAmount = ext.amount;
      }
      break;
  }

  const ok = await updatePersonPipeline(r.id, updateParams);
  if (!ok) {
    return `更新に失敗しました（${r.name} / ${stageLabel}）。`;
  }

  const lines: string[] = [];
  lines.push(`✅ ファネル更新：${r.name}`);
  lines.push(`  ${stageLabel}日: ${ext.date}`);
  if (ext.stage === "appDeal" && typeof ext.amount === "number") {
    lines.push(`  受注金額: ¥${ext.amount.toLocaleString()}`);
  }
  if (r.created) {
    lines.push("  ↳ 新規作成（People DBに無かったので追加しました）");
  }
  return lines.join("\n");
}

async function extractPipelineUpdate(
  client: OpenAI,
  text: string
): Promise<PipelineExtraction | null> {
  const today = todayJST();
  const prompt = `次の文から、営業ファネルの更新情報を抽出してください。

# 入力
${text}

# 抽出ルール
- personName: 対象の人物名（さん/氏/様抜き）
- stage: 以下のいずれか
   - "salonProposal": オンラインサロンを提案した
   - "salonJoin": サロンに参加・入会した
   - "appPitch": アプリ商談・提案した
   - "appDeal": アプリ受注・契約した
- date: 「昨日」「今日」「先週」「3日前」等の相対表現は ${today} 起点でYYYY-MM-DDに変換。明示なければ ${today}
- amount: 受注金額が数字で出てくれば数値で（円単位）。「30万」→ 300000、「1.5万」→ 15000、無ければ省略

# 出力JSON
{ "personName": "...", "stage": "...", "date": "YYYY-MM-DD", "amount": 数値 or null }

抽出できない場合は { "personName": "" } を返す`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 200,
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || "{}");
    if (!parsed.personName || typeof parsed.personName !== "string") return null;
    const validStages = [
      "salonProposal",
      "salonJoin",
      "appPitch",
      "appDeal",
    ];
    if (!validStages.includes(parsed.stage)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date || "")) {
      parsed.date = today;
    }
    return {
      personName: parsed.personName.trim(),
      stage: parsed.stage,
      date: parsed.date,
      amount: typeof parsed.amount === "number" ? parsed.amount : undefined,
    };
  } catch (err) {
    console.error("[ai-clone] ファネル抽出失敗:", err);
    return null;
  }
}

// =============================================
// 名刺モード
// =============================================

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

  if (card.email) {
    const existing = await findPersonByEmail(card.email);
    if (existing) {
      return `この方は既にPeopleに登録されています：「${existing.name}」（メール一致）。新規作成は行いませんでした。`;
    }
  }

  let companyId: string | undefined;
  let companyName = "";
  let companyCreated = false;
  if (card.companyName) {
    const c = await findOrCreateCompany(card.companyName, { hp: card.hp });
    if (c) {
      companyId = c.id;
      companyName = c.name;
      companyCreated = c.created;
    }
  }

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

# 出力JSON
{ "name": "...", "companyName": "...", "role": "...", "email": "...", "phone": "...", "hp": "..." }`;

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

// =============================================
// ヘルパー
// =============================================

function buildAmbiguousWarning(
  items: Array<{
    query: string;
    candidates: { id: string; name: string; companyHint: string }[];
  }>
): string {
  const lines: string[] = [];
  lines.push("⚠️ 同名の人物が複数登録されています。保存を中断しました。");
  lines.push("以下のうちどなたか分かるよう書き直して再投稿してください：");
  lines.push("");
  for (const item of items) {
    lines.push(`「${item.query}」候補:`);
    item.candidates.forEach((c, idx) => {
      const hint = c.companyHint ? `（${c.companyHint}）` : "";
      lines.push(`  ${idx + 1}. ${c.name}${hint}`);
    });
    lines.push("");
  }
  lines.push("例：「田中太郎」のようにフルネームで送ると一意に絞れます。");
  return lines.join("\n");
}

function ensureContentArray(v: any): { content: string }[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x?.content).map((x) => ({ content: x.content }));
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
