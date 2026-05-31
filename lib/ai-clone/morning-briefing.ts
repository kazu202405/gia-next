// AI Clone の「翌日分」ブリーフィング。
//
// 仕様（2026-05-31 更新：占い → 売上行動3件 へ差し替え）:
//   * 毎日 JST 19:00（前日夜）に Vercel Cron から /api/briefing 経由で叩かれる。
//     Vercel 無料プランは cron が1日1回までなので、配信枠はこの1本のみ。
//     → 内容は「翌日（明日）やるべき売上行動3件」。前夜のうちに翌日の動きを渡す。
//   * ai_clone_tenants.morning_briefing_enabled = true のテナントだけを対象。
//   * 各テナントの owner_user_id → tenant_members.slack_user_id を解決して Slack DM。
//
// 中身（思想: project_ai_clone_uridashi_hakkutsu_concept）:
//   右腕AI＝記憶AI。「忘れている売上行動」を3件思い出させる。
//   候補抽出は RPC ai_clone_daily_sales_actions（migration 0043）が3ルールで行う:
//     ① re_touch     重要度S/A × 最終接触30日超 → 近況うかがい
//     ② stalled_deal 商談済 × 受注未 × 14日超   → 進捗確認
//     ③ ask_referral 受注90日以内 × 紹介依頼未   → 紹介のお願い
//   候補ゼロの夜は「明日の段取り（未完タスク）」にフォールバックして空配信を避ける。
//
// 旧仕様（占術ブリーフィング）は廃止。占術エンジン（lib/divination）は
//   社内鑑定（admin/divination）の資産として残置し、ここからは呼ばない。

import { WebClient } from "@slack/web-api";
import { createClient } from "@supabase/supabase-js";
import { occursOn, type Recurrence } from "./dated-reminder";

// ===========================================================
// 型
// ===========================================================

export interface MorningBriefingDelivery {
  tenantSlug: string;
  ok: boolean;
  reason?: string;
}

export interface MorningBriefingResult {
  date: string; // 配信対象日（＝翌日）のJST日付 YYYY-MM-DD
  generatedAt: string;
  deliveries: MorningBriefingDelivery[];
}

type ActionRule = "re_touch" | "promise_stale" | "stalled_deal" | "ask_referral";

interface SalesActionRow {
  person_id: string;
  name: string;
  rule: ActionRule;
  days: number;
  reason: string;
}

interface FallbackTask {
  name: string;
  due_date: string | null;
  priority: string | null;
}

interface DueAnniversary {
  title: string;
  note: string | null;
  milestoneMonth?: number;
}

interface DueTask {
  name: string;
  due_date: string;
  priority: string | null;
}

// ===========================================================
// エントリ：全テナント走査して配信
// ===========================================================

export async function runMorningBriefing(): Promise<MorningBriefingResult> {
  // 前日19時(JST)に「翌日分」を配信する。翌日のJST日付を対象日にする。
  const date = formatJSTDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

  const targets = await listMorningBriefingTargets();
  const deliveries: MorningBriefingDelivery[] = [];

  for (const t of targets) {
    const res = await deliverToTenant(t, date);
    deliveries.push(res);
  }

  return {
    date,
    generatedAt: new Date().toISOString(),
    deliveries,
  };
}

// ===========================================================
// テナント解決
// ===========================================================

interface MorningBriefingTarget {
  tenantId: string;
  tenantSlug: string;
  ownerUserId: string | null;
}

async function listMorningBriefingTargets(): Promise<MorningBriefingTarget[]> {
  // Cron 経由なので auth セッションなし。service role キーで RLS を回避する。
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ai_clone_tenants")
    .select("id, slug, owner_user_id, morning_briefing_enabled")
    .eq("morning_briefing_enabled", true);

  if (error) {
    console.error("[morning-briefing] テナント取得失敗:", error.message);
    return [];
  }

  return (data ?? []).map(
    (row: { id: string; slug: string; owner_user_id: string | null }) => ({
      tenantId: row.id,
      tenantSlug: row.slug,
      ownerUserId: row.owner_user_id,
    }),
  );
}

async function resolveSlackUserId(
  tenantId: string,
  ownerUserId: string | null,
): Promise<string | null> {
  const supabase = getServiceClient();
  if (supabase && ownerUserId) {
    const { data } = await supabase
      .from("ai_clone_tenant_members")
      .select("slack_user_id")
      .eq("tenant_id", tenantId)
      .eq("user_id", ownerUserId)
      .maybeSingle();
    if (data?.slack_user_id) return data.slack_user_id;
  }
  // フォールバック：env の SLACK_CEO_USER_ID（goshima 専用、本番運用前提では tenant_members 側を必ず埋める）
  return process.env.SLACK_CEO_USER_ID || null;
}

// ===========================================================
// 候補抽出（RPC）＋ フォールバック
// ===========================================================

async function fetchSalesActions(
  tenantId: string,
  date: string,
): Promise<SalesActionRow[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("ai_clone_daily_sales_actions", {
    p_tenant_id: tenantId,
    p_today: date,
  });
  if (error) {
    console.error("[morning-briefing] 売上行動 RPC 失敗:", error.message);
    return [];
  }
  return (data ?? []) as SalesActionRow[];
}

// 3件を「ルール多様性優先」で選ぶ：各ルールから1件ずつ → 残り枠を days 降順で埋める。
function selectTopThree(rows: SalesActionRow[]): SalesActionRow[] {
  const order: ActionRule[] = [
    "ask_referral",
    "promise_stale",
    "stalled_deal",
    "re_touch",
  ];
  const byRule: Record<ActionRule, SalesActionRow[]> = {
    ask_referral: [],
    promise_stale: [],
    stalled_deal: [],
    re_touch: [],
  };
  for (const r of rows) {
    if (byRule[r.rule]) byRule[r.rule].push(r);
  }
  const picked: SalesActionRow[] = [];
  for (const rule of order) {
    const first = byRule[rule].shift();
    if (first) picked.push(first);
  }
  const rest = order
    .flatMap((rule) => byRule[rule])
    .sort((a, b) => b.days - a.days);
  while (picked.length < 3 && rest.length > 0) {
    picked.push(rest.shift()!);
  }
  return picked.slice(0, 3);
}

// 候補ゼロのときの受け皿：未完タスク上位3件を「明日の段取り」として出す。
async function fetchFallbackTasks(tenantId: string): Promise<FallbackTask[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_clone_task")
    .select("name, due_date, priority, status")
    .eq("tenant_id", tenantId)
    .neq("status", "完了")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(3);
  if (error) {
    console.error("[morning-briefing] フォールバックタスク取得失敗:", error.message);
    return [];
  }
  return (data ?? []) as FallbackTask[];
}

// 記念日・日付リマインド（ai_clone_dated_reminder）から「明日が対象」のものを抽出。
async function fetchDueAnniversaries(
  tenantId: string,
  date: string,
): Promise<DueAnniversary[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_clone_dated_reminder")
    .select("title, base_date, recurrence, milestone_months, note")
    .eq("tenant_id", tenantId)
    .eq("active", true);
  if (error) {
    console.error("[morning-briefing] 記念日取得失敗:", error.message);
    return [];
  }
  const out: DueAnniversary[] = [];
  for (const r of (data ?? []) as Array<{
    title: string;
    base_date: string;
    recurrence: Recurrence;
    milestone_months: number[] | null;
    note: string | null;
  }>) {
    const hit = occursOn(
      r.base_date,
      r.recurrence,
      r.milestone_months ?? [],
      date,
    );
    if (hit) {
      out.push({
        title: r.title,
        note: r.note,
        milestoneMonth: hit.milestoneMonth,
      });
    }
  }
  return out;
}

// 期限が「明日まで（＝明日 or 超過）」の未完タスク。最大5件、古い期限から。
async function fetchDueTasks(
  tenantId: string,
  date: string,
): Promise<DueTask[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_clone_task")
    .select("name, due_date, priority, status")
    .eq("tenant_id", tenantId)
    .neq("status", "完了")
    .not("due_date", "is", null)
    .lte("due_date", date)
    .order("due_date", { ascending: true })
    .limit(5);
  if (error) {
    console.error("[morning-briefing] 期限タスク取得失敗:", error.message);
    return [];
  }
  return (data ?? []).map((t: { name: string; due_date: string; priority: string | null }) => ({
    name: t.name,
    due_date: t.due_date,
    priority: t.priority,
  }));
}

// 2つの 'YYYY-MM-DD' の日数差（a - b）。
function dateDiffDays(a: string, b: string): number {
  const pa = Date.UTC(
    Number(a.slice(0, 4)),
    Number(a.slice(5, 7)) - 1,
    Number(a.slice(8, 10)),
  );
  const pb = Date.UTC(
    Number(b.slice(0, 4)),
    Number(b.slice(5, 7)) - 1,
    Number(b.slice(8, 10)),
  );
  return Math.round((pa - pb) / (24 * 60 * 60 * 1000));
}

// ===========================================================
// 1テナント配信
// ===========================================================

async function deliverToTenant(
  t: MorningBriefingTarget,
  date: string,
): Promise<MorningBriefingDelivery> {
  const slackUserId = await resolveSlackUserId(t.tenantId, t.ownerUserId);
  if (!slackUserId) {
    return {
      tenantSlug: t.tenantSlug,
      ok: false,
      reason: "Slack User ID 未解決（tenant_members.slack_user_id も env も無い）",
    };
  }

  const slack = getSlackClient();
  if (!slack) {
    return { tenantSlug: t.tenantSlug, ok: false, reason: "SLACK_BOT_TOKEN 未設定" };
  }

  // 3系統を並列取得：記念日・節目 / 期限到来タスク / 売上行動3件
  const [anniversaries, dueTasks, actionsRaw] = await Promise.all([
    fetchDueAnniversaries(t.tenantId, date),
    fetchDueTasks(t.tenantId, date),
    fetchSalesActions(t.tenantId, date),
  ]);
  const actions = selectTopThree(actionsRaw);

  const blocks: any[] = [];
  if (anniversaries.length > 0) {
    blocks.push(...buildAnniversaryBlocks(date, anniversaries));
  }
  if (dueTasks.length > 0) {
    if (blocks.length > 0) blocks.push({ type: "divider" });
    blocks.push(...buildTaskReminderBlocks(date, dueTasks));
  }
  if (actions.length > 0) {
    if (blocks.length > 0) blocks.push({ type: "divider" });
    blocks.push(...buildActionsMessage(date, actions));
  }
  // 何も無い夜だけ「明日の段取り」フォールバック
  const finalBlocks =
    blocks.length > 0
      ? blocks
      : buildFallbackMessage(date, await fetchFallbackTasks(t.tenantId));

  try {
    await slack.chat.postMessage({
      channel: slackUserId,
      text: `🌙 明日（${date}）のブリーフィング`,
      mrkdwn: true,
      blocks: finalBlocks,
    });
    return { tenantSlug: t.tenantSlug, ok: true };
  } catch (err) {
    console.error("[morning-briefing] Slack 送信失敗:", err);
    return {
      tenantSlug: t.tenantSlug,
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

// ===========================================================
// メッセージ整形
// ===========================================================

const RULE_VERB: Record<ActionRule, string> = {
  re_touch: "近況うかがいの連絡を",
  promise_stale: "約束を果たす連絡を",
  stalled_deal: "進捗確認の連絡を",
  ask_referral: "紹介のお願いを",
};

function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function buildActionsMessage(date: string, actions: SalesActionRow[]): any[] {
  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🎯 明日 ${dateLabel(date)} ／ やるべき売上行動3つ`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "忘れている売上行動を掘り起こしました。上から優先度順です。",
        },
      ],
    },
  ];

  actions.forEach((a, i) => {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*${i + 1}. ${a.name}さん*  ${a.reason}\n` +
          `→ ${RULE_VERB[a.rule]}`,
      },
    });
  });

  return blocks;
}

function buildAnniversaryBlocks(date: string, items: DueAnniversary[]): any[] {
  const lines = items.map((a) => {
    const ms = a.milestoneMonth ? `（${a.milestoneMonth}ヶ月）` : "";
    const note = a.note ? `  — ${a.note}` : "";
    return `・*${a.title}*${ms}${note}`;
  });
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🎂 明日 ${dateLabel(date)} ／ 記念日・節目`,
      },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: lines.join("\n") },
    },
  ];
}

function buildTaskReminderBlocks(date: string, tasks: DueTask[]): any[] {
  const lines = tasks.map((t) => {
    const over = dateDiffDays(date, t.due_date); // date(明日) - 期限
    const when =
      over <= 0 ? "期限：明日" : `⚠️ ${over}日超過`;
    const pri = t.priority ? `  〔優先度:${t.priority}〕` : "";
    return `・*${t.name}*  ${when}${pri}`;
  });
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🔔 明日 ${dateLabel(date)} ／ 期限リマインド`,
      },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: lines.join("\n") },
    },
  ];
}

function buildFallbackMessage(date: string, tasks: FallbackTask[]): any[] {
  if (tasks.length === 0) {
    return [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🌱 明日 ${dateLabel(date)} ／ 掘り起こし候補なし`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "明日は売上の掘り起こし候補がありません。\n" +
            "新規接点づくり・種まきに使える日です。会いたい人に連絡してみては。",
        },
      },
    ];
  }

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🗒️ 明日 ${dateLabel(date)} ／ 明日の段取り`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "掘り起こし候補が今日はないので、未完タスクから3件出しました。",
        },
      ],
    },
  ];

  tasks.forEach((t, i) => {
    const meta: string[] = [];
    if (t.priority) meta.push(`優先度:${t.priority}`);
    if (t.due_date) meta.push(`期限:${t.due_date}`);
    const tail = meta.length ? `  （${meta.join(" / ")}）` : "";
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `*${i + 1}. ${t.name}*${tail}` },
    });
  });

  return blocks;
}

// ===========================================================
// クライアントヘルパー
// ===========================================================

function getSlackClient(): WebClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  return new WebClient(token);
}

// Cron 経由は auth 文脈なしなので、service role キーで読む。
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("[morning-briefing] SUPABASE service key 未設定");
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function formatJSTDate(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
