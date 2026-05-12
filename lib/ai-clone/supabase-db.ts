// AI Clone のデータ操作層（Supabase 版）
//
// 役割:
//   conversation.ts が依存していた Notion DB 関数（notion-db.ts）を
//   Supabase に置き換えた新実装。全関数の第1引数に tenantId を取り、
//   テナント境界を where 句で必ず絞り込む。
//
// 認証:
//   Slack webhook 経由で呼ばれる前提のため、auth.uid() は取れない。
//   service_role key で RLS を越え、コード側で tenant_id を必ず付ける運用。
//
// テーブル対応:
//   Person   → ai_clone_person
//   Company  → ai_clone_company
//   Meeting  → ai_clone_meeting + ai_clone_meeting_persons
//   Note     → kind 別に5テーブル振り分け
//     Decision    → ai_clone_decision_log
//     Action      → ai_clone_task
//     Event       → ai_clone_activity_log + ai_clone_person_activity_logs
//     Learning    → ai_clone_knowledge_candidate
//     Hypothesis  → 人物紐付き時 ai_clone_person_note / 独立時 ai_clone_knowledge_candidate
//   Pipeline → ai_clone_person.salon_proposal_date など（0020 で追加）
//   Executive Context → ai_clone_mission / three_year_plan / annual_kpi /
//                       decision_principle / tone_rule / ng_rule / faq

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ───────────────────────────────────────────────────────
// service_role クライアント（RLS 越え）
// ───────────────────────────────────────────────────────

function adminSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "[ai-clone] Supabase service role が未設定。NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。",
    );
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ───────────────────────────────────────────────────────
// 共通型
// ───────────────────────────────────────────────────────

export type PersonResolution =
  | { state: "single"; id: string; name: string; created: boolean }
  | {
      state: "ambiguous";
      query: string;
      candidates: { id: string; name: string; companyHint: string }[];
    };

export type NoteKind =
  | "Decision"
  | "Hypothesis"
  | "Action"
  | "Learning"
  | "Event";

// ===========================================================
// Person 系
// ===========================================================

// 名前で People を部分一致検索（最大10件）。会社名/役職をヒントに返す。
export async function searchPeopleByName(
  tenantId: string,
  name: string,
): Promise<Array<{ id: string; name: string; companyHint: string }>> {
  const sb = adminSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("ai_clone_person")
    .select("id, name, position, company_name, company_id, ai_clone_company(name)")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${name}%`)
    .limit(10);

  if (error) {
    console.error("[ai-clone] People検索失敗:", error.message);
    return [];
  }

  return (data || []).map((row: any) => {
    // 会社名のヒント優先順位: company マスタ → person.company_name (text) → position
    const masterCompany = row.ai_clone_company?.name as string | undefined;
    const hint =
      masterCompany || (row.company_name as string | null) || row.position || "";
    return { id: row.id, name: row.name, companyHint: hint || "" };
  });
}

// 名前のみで People を新規作成（最低限）
export async function createPerson(
  tenantId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_person")
    .insert({ tenant_id: tenantId, name })
    .select("id, name")
    .single();

  if (error) {
    console.error("[ai-clone] People作成失敗:", error.message);
    return null;
  }
  return { id: data.id, name: data.name };
}

// 名刺取り込み用：詳細フィールド付きで People を新規作成
export async function createPersonDetailed(
  tenantId: string,
  params: {
    name: string;
    companyId?: string;
    role?: string;
    email?: string;
    phone?: string;
    ocrText?: string;
  },
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    name: params.name,
  };
  if (params.companyId) row.company_id = params.companyId;
  if (params.role) row.position = params.role;
  if (params.email) row.email = params.email;
  if (params.phone) row.phone = params.phone;
  if (params.ocrText) row.business_card_ocr = params.ocrText;

  const { data, error } = await sb
    .from("ai_clone_person")
    .insert(row)
    .select("id, name")
    .single();

  if (error) {
    console.error("[ai-clone] People詳細作成失敗:", error.message);
    return null;
  }
  return { id: data.id, name: data.name };
}

// メールアドレスで People を検索
export async function findPersonByEmail(
  tenantId: string,
  email: string,
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_person")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[ai-clone] PeopleEmail検索失敗:", error.message);
    return null;
  }
  return data ? { id: data.id, name: data.name } : null;
}

// 名前から People を解決:
//   0件 → 新規作成して single
//   1件 → そのIDで single
//   2件以上 → ambiguous（呼び出し側がユーザーに警告して中断）
export async function resolvePerson(
  tenantId: string,
  name: string,
): Promise<PersonResolution | null> {
  const matches = await searchPeopleByName(tenantId, name);

  if (matches.length === 0) {
    const created = await createPerson(tenantId, name);
    if (!created) return null;
    return {
      state: "single",
      id: created.id,
      name: created.name,
      created: true,
    };
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

// ===========================================================
// Company 系（会社マスタ）
// ===========================================================

// 会社名で Company を検索（部分一致、先頭1件）
export async function findCompanyByName(
  tenantId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_company")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .ilike("name", `%${name}%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[ai-clone] Company検索失敗:", error.message);
    return null;
  }
  return data ? { id: data.id, name: data.name } : null;
}

// Company 新規作成
export async function createCompany(
  tenantId: string,
  params: {
    name: string;
    hp?: string;
    industry?: string[];
  },
): Promise<{ id: string; name: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    name: params.name,
  };
  if (params.hp) row.hp = params.hp;
  if (params.industry && params.industry.length > 0) row.industry = params.industry;

  const { data, error } = await sb
    .from("ai_clone_company")
    .insert(row)
    .select("id, name")
    .single();

  if (error) {
    console.error("[ai-clone] Company作成失敗:", error.message);
    return null;
  }
  return { id: data.id, name: data.name };
}

// Company find or create
export async function findOrCreateCompany(
  tenantId: string,
  name: string,
  extras?: { hp?: string; industry?: string[] },
): Promise<{ id: string; name: string; created: boolean } | null> {
  const found = await findCompanyByName(tenantId, name);
  if (found) return { ...found, created: false };
  const created = await createCompany(tenantId, { name, ...extras });
  if (!created) return null;
  return { ...created, created: true };
}

// ===========================================================
// Meeting 系（議事録）
// ===========================================================

// Meeting 新規作成。参加者は meeting_persons リンクで多対多紐付け。
export async function createMeeting(
  tenantId: string,
  params: {
    title: string;
    date?: string;
    participantIds: string[];
    agenda?: string;
    minutes?: string;
    nextActions?: string;
    rating?: "S" | "A" | "B" | "C";
  },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    title: params.title,
  };
  if (params.date) row.occurred_on = params.date;
  if (params.agenda) row.agenda = params.agenda;
  if (params.minutes) row.minutes = params.minutes;
  if (params.nextActions) row.next_actions = params.nextActions;
  if (params.rating) row.rating = params.rating;

  const { data, error } = await sb
    .from("ai_clone_meeting")
    .insert(row)
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] Meeting作成失敗:", error?.message);
    return null;
  }

  // 参加者リンクを追加（重複時は無視）
  if (params.participantIds.length > 0) {
    const links = params.participantIds.map((personId) => ({
      meeting_id: data.id,
      person_id: personId,
    }));
    const { error: linkErr } = await sb
      .from("ai_clone_meeting_persons")
      .upsert(links, { onConflict: "meeting_id,person_id", ignoreDuplicates: true });
    if (linkErr) {
      console.error("[ai-clone] Meeting参加者リンク失敗:", linkErr.message);
    }
  }

  return { id: data.id };
}

// 同じ日の Meetings からタイトルが近いものを1件返す。
// 完全一致 > 部分一致（3文字以上）の順で選ぶ。
export async function findMeetingByApproxTitleAndDate(
  tenantId: string,
  title: string,
  date: string,
): Promise<{ id: string; title: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_meeting")
    .select("id, title")
    .eq("tenant_id", tenantId)
    .eq("occurred_on", date);

  if (error) {
    console.error("[ai-clone] Meeting日付検索失敗:", error.message);
    return null;
  }
  const meetings = data || [];
  if (meetings.length === 0) return null;

  const target = title.trim().toLowerCase();
  if (!target) return null;

  const exact = meetings.find(
    (m) => (m.title || "").trim().toLowerCase() === target,
  );
  if (exact) return { id: exact.id, title: exact.title };

  if (target.length >= 3) {
    const partial = meetings.find((m) => {
      const t = (m.title || "").trim().toLowerCase();
      if (t.length < 3) return false;
      return t.includes(target) || target.includes(t);
    });
    if (partial) return { id: partial.id, title: partial.title };
  }
  return null;
}

// 既存 Meeting に議事録・議題・ネクストアクション・参加者を追記。
// - 参加者は既存リンクと union（upsert ignoreDuplicates）
// - 議題は既存議題の「場所:」「URL:」行を保護してから新しい議題を末尾に追記
export async function appendMeetingMinutes(
  tenantId: string,
  meetingId: string,
  params: {
    agenda?: string;
    minutes?: string;
    nextActions?: string;
    addParticipantIds?: string[];
  },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;

  const update: Record<string, unknown> = {};

  // 議題：既存の「場所/URL」ヘッダーを保護
  if (params.agenda !== undefined) {
    let preservedHeader = "";
    const { data: existing } = await sb
      .from("ai_clone_meeting")
      .select("agenda")
      .eq("tenant_id", tenantId)
      .eq("id", meetingId)
      .maybeSingle();
    if (existing?.agenda) {
      const venueLines = (existing.agenda as string)
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^(場所|URL)\s*[:：]/i.test(l));
      if (venueLines.length > 0) {
        preservedHeader = venueLines.join("\n") + "\n\n";
      }
    }
    update.agenda = preservedHeader + params.agenda;
  }

  if (params.minutes !== undefined) update.minutes = params.minutes;
  if (params.nextActions !== undefined) update.next_actions = params.nextActions;

  if (Object.keys(update).length > 0) {
    const { error } = await sb
      .from("ai_clone_meeting")
      .update(update)
      .eq("tenant_id", tenantId)
      .eq("id", meetingId);
    if (error) {
      console.error("[ai-clone] Meeting更新失敗:", error.message);
      return false;
    }
  }

  if (params.addParticipantIds && params.addParticipantIds.length > 0) {
    const links = params.addParticipantIds.map((personId) => ({
      meeting_id: meetingId,
      person_id: personId,
    }));
    const { error: linkErr } = await sb
      .from("ai_clone_meeting_persons")
      .upsert(links, { onConflict: "meeting_id,person_id", ignoreDuplicates: true });
    if (linkErr) {
      console.error("[ai-clone] Meeting参加者リンク失敗:", linkErr.message);
      return false;
    }
  }

  return true;
}

// 指定人物が参加した直近 Meetings を取得
export async function fetchRecentMeetingsForPerson(
  tenantId: string,
  personId: string,
  limit: number = 5,
): Promise<
  {
    id: string;
    title: string;
    date: string;
    minutes: string;
    nextActions: string;
  }[]
> {
  const sb = adminSupabase();
  if (!sb) return [];

  // meeting_persons から meeting_id を取得 → meeting 本体を join 取得
  const { data, error } = await sb
    .from("ai_clone_meeting_persons")
    .select(
      "meeting:ai_clone_meeting!inner(id, tenant_id, title, occurred_on, minutes, next_actions)",
    )
    .eq("person_id", personId)
    .eq("meeting.tenant_id", tenantId)
    .order("occurred_on", { foreignTable: "ai_clone_meeting", ascending: false })
    .limit(limit);

  if (error) {
    console.error("[ai-clone] 人物別Meetings取得失敗:", error.message);
    return [];
  }

  return (data || [])
    .map((row: any) => row.meeting)
    .filter((m: any) => m)
    .map((m: any) => ({
      id: m.id as string,
      title: (m.title as string) || "",
      date: (m.occurred_on as string) || "",
      minutes: (m.minutes as string) || "",
      nextActions: (m.next_actions as string) || "",
    }));
}

// 指定日に開催した Meetings を取得
export async function fetchMeetingsForDate(
  tenantId: string,
  date: string,
): Promise<
  {
    id: string;
    title: string;
    nextActions: string;
  }[]
> {
  const sb = adminSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("ai_clone_meeting")
    .select("id, title, next_actions")
    .eq("tenant_id", tenantId)
    .eq("occurred_on", date)
    .limit(50);

  if (error) {
    console.error("[ai-clone] 指定日Meetings取得失敗:", error.message);
    return [];
  }
  return (data || []).map((m: any) => ({
    id: m.id,
    title: m.title || "",
    nextActions: m.next_actions || "",
  }));
}

// ===========================================================
// Note 系（kind 別に5テーブルへ振り分け）
// ===========================================================

// createNote: Notion の kind 5種を Supabase の専用テーブルに振り分けて INSERT。
// 返り値の id はそれぞれの専用テーブルのレコード ID。
export async function createNote(
  tenantId: string,
  params: {
    title: string;
    date?: string;
    kind: NoteKind;
    content: string;
    peopleIds?: string[];
  },
): Promise<{ id: string } | null> {
  switch (params.kind) {
    case "Decision":
      return createDecisionLog(tenantId, params);
    case "Action":
      return createTaskFromNote(tenantId, params);
    case "Event":
      return createActivityLog(tenantId, params);
    case "Learning":
      return createKnowledgeCandidate(tenantId, params, "Learning候補");
    case "Hypothesis":
      // 人物紐付きがあれば person_note（最初の1人だけ）、無ければ knowledge_candidate
      if (params.peopleIds && params.peopleIds.length > 0) {
        return createPersonNote(tenantId, params.peopleIds[0], params);
      }
      return createKnowledgeCandidate(tenantId, params, "Hypothesis候補");
  }
}

async function createDecisionLog(
  tenantId: string,
  params: { title: string; date?: string; content: string; peopleIds?: string[] },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const occurredAt = params.date
    ? `${params.date}T00:00:00+09:00`
    : new Date().toISOString();

  const { data, error } = await sb
    .from("ai_clone_decision_log")
    .insert({
      tenant_id: tenantId,
      occurred_at: occurredAt,
      theme: params.title,
      conclusion: params.content,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] DecisionLog作成失敗:", error?.message);
    return null;
  }

  if (params.peopleIds && params.peopleIds.length > 0) {
    const links = params.peopleIds.map((personId) => ({
      person_id: personId,
      decision_log_id: data.id,
    }));
    await sb
      .from("ai_clone_person_decision_logs")
      .upsert(links, { onConflict: "person_id,decision_log_id", ignoreDuplicates: true });
  }

  return { id: data.id };
}

async function createTaskFromNote(
  tenantId: string,
  params: { title: string; date?: string; content: string; peopleIds?: string[] },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_task")
    .insert({
      tenant_id: tenantId,
      name: params.title,
      origin_log: params.content,
      due_date: params.date || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] Task作成失敗:", error?.message);
    return null;
  }

  if (params.peopleIds && params.peopleIds.length > 0) {
    const links = params.peopleIds.map((personId) => ({
      person_id: personId,
      task_id: data.id,
    }));
    await sb
      .from("ai_clone_person_tasks")
      .upsert(links, { onConflict: "person_id,task_id", ignoreDuplicates: true });
  }

  return { id: data.id };
}

async function createActivityLog(
  tenantId: string,
  params: { title: string; date?: string; content: string; peopleIds?: string[] },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_activity_log")
    .insert({
      tenant_id: tenantId,
      occurred_date: params.date || todayJST(),
      content: `${params.title}\n${params.content}`.trim(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] ActivityLog作成失敗:", error?.message);
    return null;
  }

  if (params.peopleIds && params.peopleIds.length > 0) {
    const links = params.peopleIds.map((personId) => ({
      person_id: personId,
      activity_log_id: data.id,
    }));
    await sb
      .from("ai_clone_person_activity_logs")
      .upsert(links, { onConflict: "person_id,activity_log_id", ignoreDuplicates: true });
  }

  return { id: data.id };
}

async function createKnowledgeCandidate(
  tenantId: string,
  params: { title: string; date?: string; content: string },
  kind: string,
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("ai_clone_knowledge_candidate")
    .insert({
      tenant_id: tenantId,
      content: `${params.title}\n${params.content}`.trim(),
      kind,
      origin_log: params.date || "",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] KnowledgeCandidate作成失敗:", error?.message);
    return null;
  }
  return { id: data.id };
}

async function createPersonNote(
  tenantId: string,
  personId: string,
  params: { title: string; date?: string; content: string },
): Promise<{ id: string } | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const occurredAt = params.date
    ? `${params.date}T00:00:00+09:00`
    : new Date().toISOString();

  const { data, error } = await sb
    .from("ai_clone_person_note")
    .insert({
      tenant_id: tenantId,
      person_id: personId,
      occurred_at: occurredAt,
      content: `${params.title}\n${params.content}`.trim(),
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ai-clone] PersonNote作成失敗:", error?.message);
    return null;
  }
  return { id: data.id };
}

// 特定人物に紐づく直近 Notes を5テーブル横断で取得（新しい順、合計 limit 件）
export async function fetchRecentNotesForPerson(
  tenantId: string,
  personId: string,
  limit: number = 10,
): Promise<
  {
    id: string;
    title: string;
    date: string;
    kind: string;
    content: string;
  }[]
> {
  const sb = adminSupabase();
  if (!sb) return [];

  // 5テーブル並列取得 → マージ → occurred 日時で降順ソート → limit
  const [decisions, tasks, activities, knowledge, personNotes] = await Promise.all([
    sb
      .from("ai_clone_person_decision_logs")
      .select("decision_log:ai_clone_decision_log!inner(id, tenant_id, occurred_at, theme, conclusion)")
      .eq("person_id", personId)
      .eq("decision_log.tenant_id", tenantId)
      .order("occurred_at", { foreignTable: "ai_clone_decision_log", ascending: false })
      .limit(limit),
    sb
      .from("ai_clone_person_tasks")
      .select("task:ai_clone_task!inner(id, tenant_id, name, due_date, origin_log, created_at)")
      .eq("person_id", personId)
      .eq("task.tenant_id", tenantId)
      .order("created_at", { foreignTable: "ai_clone_task", ascending: false })
      .limit(limit),
    sb
      .from("ai_clone_person_activity_logs")
      .select("activity:ai_clone_activity_log!inner(id, tenant_id, occurred_date, content)")
      .eq("person_id", personId)
      .eq("activity.tenant_id", tenantId)
      .order("occurred_date", { foreignTable: "ai_clone_activity_log", ascending: false })
      .limit(limit),
    // knowledge_candidate は人物リンクが無い設計のため、ここでは取らない（Hypothesis 独立分のみ knowledge へ行く）
    Promise.resolve({ data: [], error: null }) as any,
    sb
      .from("ai_clone_person_note")
      .select("id, occurred_at, content")
      .eq("tenant_id", tenantId)
      .eq("person_id", personId)
      .order("occurred_at", { ascending: false })
      .limit(limit),
  ]);

  type Row = { id: string; title: string; date: string; kind: string; content: string };
  const merged: Row[] = [];

  for (const r of (decisions.data || []) as any[]) {
    const d = r.decision_log;
    if (!d) continue;
    merged.push({
      id: d.id,
      title: d.theme || "",
      date: (d.occurred_at || "").slice(0, 10),
      kind: "Decision",
      content: d.conclusion || "",
    });
  }
  for (const r of (tasks.data || []) as any[]) {
    const t = r.task;
    if (!t) continue;
    merged.push({
      id: t.id,
      title: t.name || "",
      date: t.due_date || (t.created_at || "").slice(0, 10),
      kind: "Action",
      content: t.origin_log || "",
    });
  }
  for (const r of (activities.data || []) as any[]) {
    const a = r.activity;
    if (!a) continue;
    merged.push({
      id: a.id,
      title: (a.content || "").slice(0, 40),
      date: a.occurred_date || "",
      kind: "Event",
      content: a.content || "",
    });
  }
  for (const n of (personNotes.data || []) as any[]) {
    merged.push({
      id: n.id,
      title: (n.content || "").split("\n")[0]?.slice(0, 40) || "",
      date: (n.occurred_at || "").slice(0, 10),
      kind: "Hypothesis",
      content: n.content || "",
    });
  }

  // 日付降順マージ → 上位 limit 件
  merged.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return merged.slice(0, limit);
}

// ===========================================================
// Pipeline 系（ファネル状態）
// ===========================================================

// 特定人物のファネル状態を更新（最新化を優先、既存値は上書き）
export async function updatePersonPipeline(
  tenantId: string,
  personId: string,
  params: {
    salonProposalDate?: string;
    salonJoinDate?: string;
    appPitchDate?: string;
    appDealDate?: string;
    dealAmount?: number;
  },
): Promise<boolean> {
  const sb = adminSupabase();
  if (!sb) return false;

  const update: Record<string, unknown> = {};
  if (params.salonProposalDate) update.salon_proposal_date = params.salonProposalDate;
  if (params.salonJoinDate) update.salon_join_date = params.salonJoinDate;
  if (params.appPitchDate) update.app_pitch_date = params.appPitchDate;
  if (params.appDealDate) update.app_deal_date = params.appDealDate;
  if (typeof params.dealAmount === "number") update.deal_amount = params.dealAmount;

  if (Object.keys(update).length === 0) return true;

  const { error } = await sb
    .from("ai_clone_person")
    .update(update)
    .eq("tenant_id", tenantId)
    .eq("id", personId);

  if (error) {
    console.error("[ai-clone] Pipeline更新失敗:", error.message);
    return false;
  }
  return true;
}

// ファネル集計（admin dashboard 用）
export interface PipelineStageCount {
  thisMonth: number;
  allTime: number;
}
export interface PipelineAggregates {
  monthLabel: string;
  salonProposal: PipelineStageCount;
  salonJoin: PipelineStageCount;
  appPitch: PipelineStageCount;
  appDeal: PipelineStageCount;
  monthlyRevenue: number;
  totalRevenue: number;
}

export async function fetchPipelineAggregates(
  tenantId: string,
  year: number,
  month: number,
): Promise<PipelineAggregates> {
  const empty: PipelineAggregates = {
    monthLabel: `${year}年${month}月`,
    salonProposal: { thisMonth: 0, allTime: 0 },
    salonJoin: { thisMonth: 0, allTime: 0 },
    appPitch: { thisMonth: 0, allTime: 0 },
    appDeal: { thisMonth: 0, allTime: 0 },
    monthlyRevenue: 0,
    totalRevenue: 0,
  };

  const sb = adminSupabase();
  if (!sb) return empty;

  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
  const inThisMonth = (iso: string | null) =>
    !!iso && iso.startsWith(monthPrefix);

  const { data, error } = await sb
    .from("ai_clone_person")
    .select(
      "salon_proposal_date, salon_join_date, app_pitch_date, app_deal_date, deal_amount",
    )
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[ai-clone] Pipeline集計失敗:", error.message);
    return empty;
  }

  for (const row of (data || []) as any[]) {
    if (row.salon_proposal_date) {
      empty.salonProposal.allTime++;
      if (inThisMonth(row.salon_proposal_date)) empty.salonProposal.thisMonth++;
    }
    if (row.salon_join_date) {
      empty.salonJoin.allTime++;
      if (inThisMonth(row.salon_join_date)) empty.salonJoin.thisMonth++;
    }
    if (row.app_pitch_date) {
      empty.appPitch.allTime++;
      if (inThisMonth(row.app_pitch_date)) empty.appPitch.thisMonth++;
    }
    if (row.app_deal_date) {
      empty.appDeal.allTime++;
      if (inThisMonth(row.app_deal_date)) empty.appDeal.thisMonth++;
      const amount = Number(row.deal_amount) || 0;
      empty.totalRevenue += amount;
      if (inThisMonth(row.app_deal_date)) empty.monthlyRevenue += amount;
    }
  }

  return empty;
}

// ===========================================================
// 月次集計
// ===========================================================

export async function fetchMonthlyAggregates(
  tenantId: string,
  year: number,
  month: number,
): Promise<{
  monthRange: { start: string; end: string };
  notesByKind: Record<string, number>;
  notesTotal: number;
  meetings: number;
  peopleTotal: number;
  allTime: { notes: number; meetings: number };
}> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const sb = adminSupabase();
  const empty = {
    monthRange: { start, end },
    notesByKind: {},
    notesTotal: 0,
    meetings: 0,
    peopleTotal: 0,
    allTime: { notes: 0, meetings: 0 },
  };
  if (!sb) return empty;

  // 月内・全期間カウントを並列実行
  const [
    decisionsMonth,
    tasksMonth,
    activitiesMonth,
    knowledgeMonth,
    personNotesMonth,
    meetingsMonth,
    decisionsAll,
    tasksAll,
    activitiesAll,
    knowledgeAll,
    personNotesAll,
    meetingsAll,
    peopleAll,
  ] = await Promise.all([
    sb
      .from("ai_clone_decision_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("occurred_at", `${start}T00:00:00+09:00`)
      .lte("occurred_at", `${end}T23:59:59+09:00`),
    sb
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", `${start}T00:00:00+09:00`)
      .lte("created_at", `${end}T23:59:59+09:00`),
    sb
      .from("ai_clone_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("occurred_date", start)
      .lte("occurred_date", end),
    sb
      .from("ai_clone_knowledge_candidate")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("created_at", `${start}T00:00:00+09:00`)
      .lte("created_at", `${end}T23:59:59+09:00`),
    sb
      .from("ai_clone_person_note")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("occurred_at", `${start}T00:00:00+09:00`)
      .lte("occurred_at", `${end}T23:59:59+09:00`),
    sb
      .from("ai_clone_meeting")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gte("occurred_on", start)
      .lte("occurred_on", end),
    sb
      .from("ai_clone_decision_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_task")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_activity_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_knowledge_candidate")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_person_note")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_meeting")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    sb
      .from("ai_clone_person")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  const dMonth = decisionsMonth.count || 0;
  const tMonth = tasksMonth.count || 0;
  const aMonth = activitiesMonth.count || 0;
  const kMonth = knowledgeMonth.count || 0;
  const pnMonth = personNotesMonth.count || 0;

  const notesByKind: Record<string, number> = {
    Decision: dMonth,
    Action: tMonth,
    Event: aMonth,
    Learning: kMonth,
    Hypothesis: pnMonth,
  };
  const notesTotal = dMonth + tMonth + aMonth + kMonth + pnMonth;

  return {
    monthRange: { start, end },
    notesByKind,
    notesTotal,
    meetings: meetingsMonth.count || 0,
    peopleTotal: peopleAll.count || 0,
    allTime: {
      notes:
        (decisionsAll.count || 0) +
        (tasksAll.count || 0) +
        (activitiesAll.count || 0) +
        (knowledgeAll.count || 0) +
        (personNotesAll.count || 0),
      meetings: meetingsAll.count || 0,
    },
  };
}

// ===========================================================
// 経営コンテキスト（Core OS 7テーブルから集約して構成）
// ===========================================================

// fetchExecutiveContext: ai_clone_mission / three_year_plan / annual_kpi /
// decision_principle / tone_rule / ng_rule / faq を読み込み、システムプロンプト用の
// markdown テキストとして連結して返す。1テーブル失敗しても他は残す。
export async function fetchExecutiveContext(tenantId: string): Promise<string> {
  const sb = adminSupabase();
  if (!sb) return getFallbackContext();

  const [mission, plan, kpi, principles, tones, ngs, faqs] = await Promise.all([
    sb.from("ai_clone_mission").select("*").eq("tenant_id", tenantId).limit(1).maybeSingle(),
    sb.from("ai_clone_three_year_plan").select("*").eq("tenant_id", tenantId).limit(1).maybeSingle(),
    // migration 0021 で 1年度=複数KPI レコードに変更。最新年度の全KPIを取る。
    sb.from("ai_clone_annual_kpi").select("*").eq("tenant_id", tenantId).order("fiscal_year", { ascending: false }).order("created_at", { ascending: true }).limit(50),
    sb.from("ai_clone_decision_principle").select("*").eq("tenant_id", tenantId).limit(20),
    sb.from("ai_clone_tone_rule").select("*").eq("tenant_id", tenantId).limit(5),
    sb.from("ai_clone_ng_rule").select("*").eq("tenant_id", tenantId).limit(10),
    sb.from("ai_clone_faq").select("*").eq("tenant_id", tenantId).limit(30),
  ]);

  const sections: string[] = [];

  if (mission.data) {
    const m = mission.data as any;
    const lines: string[] = ["# ミッション・理念"];
    if (m.mission) lines.push(`**ミッション**: ${m.mission}`);
    if (m.values_tags?.length) lines.push(`**価値観**: ${m.values_tags.join(" / ")}`);
    if (m.target_world) lines.push(`**目指す世界**: ${m.target_world}`);
    if (m.not_doing) lines.push(`**やらないこと**: ${m.not_doing}`);
    if (m.value_to_customer) lines.push(`**お客様に届けたい価値**: ${m.value_to_customer}`);
    sections.push(lines.join("\n"));
  }

  if (plan.data) {
    const p = plan.data as any;
    const lines: string[] = ["# 3年計画"];
    if (p.plan_name) lines.push(`**計画名**: ${p.plan_name}`);
    if (p.ideal_state_in_3y) lines.push(`**3年後の理想状態**: ${p.ideal_state_in_3y}`);
    if (p.business_pillars?.length) lines.push(`**事業の柱**: ${p.business_pillars.join(" / ")}`);
    if (p.revenue_model) lines.push(`**収益モデル**: ${p.revenue_model}`);
    if (p.assets_to_build) lines.push(`**作りたい資産**: ${p.assets_to_build}`);
    if (p.work_style_to_quit) lines.push(`**やめたい働き方**: ${p.work_style_to_quit}`);
    sections.push(lines.join("\n"));
  }

  if (kpi.data && kpi.data.length > 0) {
    // 年度ごとにグループ化して整形（最新年度が先頭）
    const byYear = new Map<string, any[]>();
    for (const row of kpi.data as any[]) {
      const y = row.fiscal_year || "未設定";
      const arr = byYear.get(y) ?? [];
      arr.push(row);
      byYear.set(y, arr);
    }
    for (const [year, rows] of byYear) {
      const lines: string[] = [`# ${year}年度 KPI`];
      for (const r of rows) {
        const value =
          r.target_value === null || r.target_value === undefined
            ? "—"
            : `${Number(r.target_value).toLocaleString("ja-JP")}${r.unit ? ` ${r.unit}` : ""}`;
        lines.push(`- **${r.title}**: ${value}`);
      }
      sections.push(lines.join("\n"));
    }
  }

  if (principles.data && principles.data.length > 0) {
    const lines: string[] = ["# 判断基準"];
    for (const p of principles.data as any[]) {
      const head = `- **${p.name}**${p.priority ? `（優先度:${p.priority}）` : ""}`;
      const detail = p.rule ? `: ${p.rule}` : "";
      const reason = p.reason ? `\n  理由: ${p.reason}` : "";
      lines.push(head + detail + reason);
    }
    sections.push(lines.join("\n"));
  }

  if (tones.data && tones.data.length > 0) {
    const lines: string[] = ["# 口調・対応ルール"];
    for (const t of tones.data as any[]) {
      lines.push(`- **${t.name}**`);
      if (t.base_tone) lines.push(`  基本の口調: ${t.base_tone}`);
      if (t.ng_expressions) lines.push(`  NG表現: ${t.ng_expressions}`);
      if (t.reply_length) lines.push(`  返信の長さ: ${t.reply_length}`);
    }
    sections.push(lines.join("\n"));
  }

  if (ngs.data && ngs.data.length > 0) {
    const lines: string[] = ["# NG判断・確認ルール"];
    for (const n of ngs.data as any[]) {
      lines.push(`- **${n.area_name}**`);
      if (n.reason_not_for_ai) lines.push(`  AIに任せない理由: ${n.reason_not_for_ai}`);
      if (n.escalation_target) lines.push(`  エスカレ先: ${n.escalation_target}`);
    }
    sections.push(lines.join("\n"));
  }

  if (faqs.data && faqs.data.length > 0) {
    const lines: string[] = ["# FAQ"];
    for (const f of faqs.data as any[]) {
      lines.push(`- Q: ${f.question}`);
      if (f.base_answer) lines.push(`  A: ${f.base_answer}`);
      if (f.caveat) lines.push(`  注意: ${f.caveat}`);
    }
    sections.push(lines.join("\n"));
  }

  if (sections.length === 0) return getFallbackContext();
  return sections.join("\n\n---\n\n");
}

// Supabase 接続不能・データ未登録時のフォールバック
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
`;
}

// ===========================================================
// Google Calendar 連携 lookup
// ===========================================================

// テナントの「主たる Google Calendar」を引く。
// 優先順位: owner（owner_user_id 一致）の google_calendar_id → 最初に見つかったメンバーの値。
// 未登録なら null（呼び出し側は env GOOGLE_CALENDAR_ID にフォールバックする想定）。
export async function getTenantPrimaryCalendarId(
  tenantId: string,
): Promise<string | null> {
  const sb = adminSupabase();
  if (!sb) return null;

  const { data: tenant } = await sb
    .from("ai_clone_tenants")
    .select("owner_user_id")
    .eq("id", tenantId)
    .maybeSingle();

  // 1. owner の google_calendar_id を最優先
  if (tenant?.owner_user_id) {
    const { data: ownerMember } = await sb
      .from("ai_clone_tenant_members")
      .select("google_calendar_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", tenant.owner_user_id)
      .maybeSingle();
    if (ownerMember?.google_calendar_id) return ownerMember.google_calendar_id;
  }

  // 2. テナント内のどれかのメンバーが連携済みなら、それを使う
  const { data: anyMember } = await sb
    .from("ai_clone_tenant_members")
    .select("google_calendar_id")
    .eq("tenant_id", tenantId)
    .not("google_calendar_id", "is", null)
    .limit(1)
    .maybeSingle();
  return anyMember?.google_calendar_id ?? null;
}

// ===========================================================
// ヘルパー
// ===========================================================

function todayJST(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
