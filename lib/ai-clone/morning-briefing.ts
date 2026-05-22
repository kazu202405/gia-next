// AI Clone の「翌日分」ブリーフィング。
//
// 仕様（2026-05-22 更新）:
//   * 毎日 JST 19:00（前日夜）に Vercel Cron から /api/briefing 経由で叩かれる。
//     → 内容は「翌日（明日）」の気質。前夜のうちに翌日の動きを渡す狙い。
//     （旧仕様：朝6:00 にその日分を配信。2026-05-22 に前日19時×翌日分へ変更）
//   * ai_clone_tenants.morning_briefing_enabled = true のテナントだけを対象にする。
//   * 各テナントの owner_user_id → tenant_members.slack_user_id を解決して Slack DM。
//   * 内容は2セクション固定（占術は明日のJST日付で算出）:
//     1) 「YYYY年M月D日 ／ この日の気質」: 日柱からの汎用解釈（calculatePillarFortune("今日", ...)）
//     2) 「PERSONAL BY TIMEFRAME ／ YYYY/M/D 生まれにとっての各時間軸」:
//        本人の日干 × 今年/今月/明日 で個別解釈 3 連（calculatePersonalPillarFortune）
//   * 占術の TimeframeLabel は "今日" のまま使い、表示文字列だけ "明日" に置換する
//     （lib/divination 側の型・テンプレを壊さないため。relabelTomorrow を参照）
//
// 拡張余地（あえて入れていない）:
//   * 朝の予定一覧（Google Calendar）の同梱 → 仕様確定したら別途
//   * 占い結果の経営判断連動 → 別タスク
//   * 他テナント展開 → owner_birthday を埋めて enabled=true にするだけで自動で乗る

import { WebClient } from "@slack/web-api";
import { createClient } from "@supabase/supabase-js";
import {
  getYearKanshi,
  getMonthKanshi,
  getDayKanshi,
} from "../divination/kanshi/calc";
import {
  calculatePillarFortune,
  calculatePersonalPillarFortune,
} from "../divination/fortune/timeframe";

// ===========================================================
// 型
// ===========================================================

export interface MorningBriefingDelivery {
  tenantSlug: string;
  ok: boolean;
  reason?: string;
}

export interface MorningBriefingResult {
  date: string; // 今日のJST日付 YYYY-MM-DD
  generatedAt: string;
  deliveries: MorningBriefingDelivery[];
}

// ===========================================================
// エントリ：全テナント走査して配信
// ===========================================================

export async function runMorningBriefing(): Promise<MorningBriefingResult> {
  // 前日19時(JST)に「翌日分」を配信する。明日のJST日付で占術を算出する。
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
  ownerBirthday: string; // ISO YYYY-MM-DD
  ownerBirthplace: string | null;
  ownerGender: string | null;
}

async function listMorningBriefingTargets(): Promise<MorningBriefingTarget[]> {
  // Cron 経由なので auth セッションなし。service role キーで RLS を回避する。
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("ai_clone_tenants")
    .select(
      "id, slug, owner_user_id, owner_birthday, owner_birthplace, owner_gender, morning_briefing_enabled",
    )
    .eq("morning_briefing_enabled", true);

  if (error) {
    console.error("[morning-briefing] テナント取得失敗:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row: { owner_birthday: string | null }) => Boolean(row.owner_birthday))
    .map(
      (row: {
        id: string;
        slug: string;
        owner_user_id: string | null;
        owner_birthday: string;
        owner_birthplace: string | null;
        owner_gender: string | null;
      }) => ({
        tenantId: row.id,
        tenantSlug: row.slug,
        ownerUserId: row.owner_user_id,
        ownerBirthday: row.owner_birthday,
        ownerBirthplace: row.owner_birthplace,
        ownerGender: row.owner_gender,
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

  const birthdayParts = parseBirthday(t.ownerBirthday);
  if (!birthdayParts) {
    return {
      tenantSlug: t.tenantSlug,
      ok: false,
      reason: `owner_birthday の形式が不正：${t.ownerBirthday}`,
    };
  }

  const message = buildMorningMessage(date, birthdayParts);

  try {
    await slack.chat.postMessage({
      channel: slackUserId,
      text: `🌙 明日（${date}）のブリーフィング`,
      mrkdwn: true,
      blocks: message.blocks,
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
// 占術 → メッセージ整形
// ===========================================================

interface BirthdayParts {
  year: number;
  month: number;
  day: number;
}

function parseBirthday(iso: string): BirthdayParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
  };
}

// 占術結果の表示文字列の "今日" を "明日" に置換する。
// 占術ロジックは TimeframeLabel="今日"（日柱）のまま動かし、文言だけ翌日向けにする。
function relabelTomorrow<T extends { headline: string; body: string; advice: string }>(
  f: T,
): T {
  return {
    ...f,
    headline: f.headline.replace(/今日/g, "明日"),
    body: f.body.replace(/今日/g, "明日"),
    advice: f.advice.replace(/今日/g, "明日"),
  };
}

function buildMorningMessage(
  date: string,
  birthday: BirthdayParts,
): { blocks: any[] } {
  const [y, m, d] = date.split("-").map(Number);

  // 今日の3柱
  const [yearKan, yearShi] = getYearKanshi(y, m, d);
  const [monthKan, monthShi] = getMonthKanshi(y, m, d, yearKan);
  const [dayKan, dayShi] = getDayKanshi(y, m, d);

  // 本人の日干
  const [selfDayKan] = getDayKanshi(birthday.year, birthday.month, birthday.day);

  // 明日の気質（汎用、日柱ベース）。日付はすでに明日なので、文言だけ "明日" に置換。
  const today = relabelTomorrow(calculatePillarFortune("今日", dayKan, dayShi));

  // 個人時間軸（今年/今月は前日夜でも当年・当月なので据え置き、今日→明日に置換）
  const pYear = calculatePersonalPillarFortune(selfDayKan, "今年", yearKan, yearShi);
  const pMonth = calculatePersonalPillarFortune(selfDayKan, "今月", monthKan, monthShi);
  const pToday = relabelTomorrow(
    calculatePersonalPillarFortune(selfDayKan, "今日", dayKan, dayShi),
  );

  // Slack Blocks
  const dateLabel = `${y}年${m}月${d}日`;
  const bdLabel = `${birthday.year}/${birthday.month}/${birthday.day}`;

  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `🌙 明日 ${dateLabel} ／ この日の気質` },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*${today.headline}*  〔${dayKan}${dayShi}〕\n` +
          `${today.body}\n` +
          `→ ${today.advice}`,
      },
    },
    { type: "divider" },
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `PERSONAL BY TIMEFRAME ／ ${bdLabel} 生まれにとっての各時間軸`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*▼ 今年（${yearKan}${yearShi}・${pYear.relation}）*\n` +
          `${pYear.headline}\n${pYear.body}\n→ ${pYear.advice}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*▼ 今月（${monthKan}${monthShi}・${pMonth.relation}）*\n` +
          `${pMonth.headline}\n${pMonth.body}\n→ ${pMonth.advice}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*▼ 明日（${dayKan}${dayShi}・${pToday.relation}）*\n` +
          `${pToday.headline}\n${pToday.body}\n→ ${pToday.advice}`,
      },
    },
  ];

  return { blocks };
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
// 公開クライアントを使うと RLS で「自分の所属テナント」しか引けず、全テナント走査ができない。
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
