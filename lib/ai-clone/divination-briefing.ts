// AI Clone 夜ブリーフィングの「占術セクション」。
//
// 目的（2026-07-28 追加）:
//   オーナー本人の陰占・陽占（＝生涯変わらない宿命）と、
//   配信対象日（＝明日）の日干支から「明日がどんな日で、あなたの型ならどう過ごすと良いか」を出す。
//
// 位置づけ:
//   夜ブリーフィングの看板はあくまで「売上行動3件」(project_ai_clone_uridashi_hakkutsu_concept)。
//   占術はその下に付ける別セクション。売上行動を薄めないため、必ず末尾に置く。
//
// データ源:
//   * 本人の生年月日 = ai_clone_tenants.owner_birthday / owner_birth_hour（migration 0029）。
//     未設定のテナントは占術セクションを丸ごと出さない（空配列を返す）。
//   * 占術計算 = lib/divination（/admin/divination と同じエンジンを共有）。
//
// 堅牢性:
//   「本人ならどう過ごすか」の文章は OpenAI で生成するが、キー未設定・API失敗時は
//   必ず決定的テンプレへフォールバックする。占術セクションの失敗が
//   ブリーフィング全体（売上行動）を落とすことは絶対に避ける。呼び出し側は
//   このモジュールを try/catch で包み、失敗時は [] を使うこと。

import { calculateInyo, type InyoResult } from "@/lib/divination/sanmei/inyo";
import { calculateYojo, type YojoResult } from "@/lib/divination/sanmei/yojo";
import { getDayKanshi } from "@/lib/divination/kanshi/calc";
import {
  calculatePersonalPillarFortune,
  type PersonalPillarFortune,
} from "@/lib/divination/fortune/timeframe";
import { JUDAI_DESCRIPTIONS } from "@/lib/divination/sanmei/descriptions";
import { getOpenAIClient, resolveModel } from "@/lib/openai/client";

export interface DivinationOwner {
  /** ai_clone_tenants.owner_birthday（'YYYY-MM-DD'）。null なら占術は出さない。 */
  birthday: string | null;
  /** ai_clone_tenants.owner_birth_hour（0-23）。任意。 */
  birthHour?: number | null;
}

// ── エントリ：占術セクションの Slack blocks を返す ────────────────

/**
 * オーナーの陰占・陽占＋対象日（明日）の運勢から、Slack blocks を生成する。
 * 生年月日が無ければ空配列（セクションを出さない）。
 * @param owner   テナントのオーナー占術プロフィール
 * @param date    配信対象日 'YYYY-MM-DD'（＝明日。runMorningBriefing が算出済み）
 */
export async function buildDivinationBlocks(
  owner: DivinationOwner,
  date: string,
): Promise<any[]> {
  const birth = parseBirthday(owner.birthday);
  if (!birth) return [];

  const target = parseYmd(date);
  if (!target) return [];

  // 本人の生涯変わらない宿命（陰占＝命式、陽占＝人体星図）
  const inyo = calculateInyo({
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: typeof owner.birthHour === "number" ? owner.birthHour : undefined,
  });
  const yojo = calculateYojo(birth.year, birth.month, birth.day);

  // 明日の日干支 → 本人の日干との通変で「どんな日か・どう過ごすか」の骨格を得る
  const [dayKan, dayShi] = getDayKanshi(
    target.year,
    target.month,
    target.day,
  );
  const fortune = calculatePersonalPillarFortune(
    inyo.dayKan,
    "今日",
    dayKan,
    dayShi,
  );

  // 「あなたの型ならどう過ごすか」の本文（AI生成、失敗時はテンプレ）
  const advice = await composeAdvice(inyo, yojo, fortune, date);

  return buildBlocks(inyo, yojo, fortune, advice, date);
}

// ── 「どう過ごすか」本文の生成 ──────────────────────────────────

async function composeAdvice(
  inyo: InyoResult,
  yojo: YojoResult,
  fortune: PersonalPillarFortune,
  date: string,
): Promise<string> {
  const center = yojo.jintai.center;
  const centerInfo = JUDAI_DESCRIPTIONS[center];

  const client = getOpenAIClient();
  if (!client) return fallbackAdvice(inyo, yojo, fortune);

  const prompt = `あなたは算命学の鑑定士です。相談者の「生涯変わらない宿命」と「明日という一日の巡り」を踏まえ、明日の過ごし方を助言してください。

# 相談者の宿命（陰占・陽占）
- 中心星（本来の自分）: ${center}（${centerInfo.subtitle}）— ${centerInfo.keyword}
- 強み: ${centerInfo.strength}
- 課題: ${centerInfo.weakness}
- 日干（五行）: ${infoDayLine(inyo)}
- 3大従星エネルギー: ${yojo.uchuban.totalEnergy}／36
- 五行の偏り: 強い=${inyo.gogyo.strong.join("・") || "なし"} / 無い=${inyo.gogyo.weak.join("・") || "なし"}

# 明日という日の巡り（本人の日干 × 明日の日干支）
- 明日の日柱: ${fortune.pillarKanGogyo}／${fortune.pillarShiGogyo}
- 明日のトーン: ${fortune.headline}
- 基本の流れ: ${fortune.body}
- 汎用の指針: ${fortune.advice}

# 出力の指示
- 「明日は〜な日。${center}のあなたなら〜」という形で、宿命の型と明日の巡りを掛け合わせて具体化する。
- 3〜4文、合計160字以内。落ち着いた鑑定士の口調。絵文字なし。
- 仕事・時間の使い方・心の置き方に絞る。投資・医療・健康の断定的助言はしない。
- 「必ず」「絶対」などの断定や、不安を煽る表現は避ける。背中を押すトーンで。
本文のみを返してください（見出しや前置きは不要）。`;

  try {
    const res = await client.chat.completions.create({
      model: resolveModel(),
      messages: [{ role: "user", content: prompt }],
      max_tokens: 320,
      temperature: 0.7,
    });
    const text = res.choices[0]?.message?.content?.trim();
    return text && text.length > 0
      ? text
      : fallbackAdvice(inyo, yojo, fortune);
  } catch (err) {
    console.error("[divination-briefing] AI生成失敗、テンプレへ:", err);
    return fallbackAdvice(inyo, yojo, fortune);
  }
}

// AI未接続・失敗時の決定的フォールバック。宿命の中心星と明日のトーンを機械的に接ぐ。
function fallbackAdvice(
  inyo: InyoResult,
  yojo: YojoResult,
  fortune: PersonalPillarFortune,
): string {
  const center = yojo.jintai.center;
  const info = JUDAI_DESCRIPTIONS[center];
  return (
    `明日は「${fortune.headline}」。${fortune.body}\n` +
    `${center}（${info.subtitle}）のあなたは「${info.strength}」が持ち味。` +
    `${fortune.advice} 課題の「${info.weakness}」は今日は横に置いて構いません。`
  );
}

// ── Slack blocks 整形 ──────────────────────────────────────────

function buildBlocks(
  inyo: InyoResult,
  yojo: YojoResult,
  fortune: PersonalPillarFortune,
  advice: string,
  date: string,
): any[] {
  const center = yojo.jintai.center;
  const dayPillar = inyo.pillars.find((p) => p.label === "日柱");
  const meishi = dayPillar
    ? `${dayPillar.kan}${dayPillar.shi}`
    : `${inyo.dayKan}`;
  const tenchuu = inyo.tenchuuSatsu.join("・");
  const strong = inyo.gogyo.strong.join("・") || "偏りなし";
  const weak = inyo.gogyo.weak.join("・") || "なし";

  // 陰占・陽占の要約（本人の型）。生涯変わらない宿命なので毎日同じ。
  const selfLine =
    `*あなたの型（陰占・陽占）*\n` +
    `・中心星（本来の自分）：*${center}*（${JUDAI_DESCRIPTIONS[center].subtitle}）\n` +
    `・日柱（陰占）：${meishi}／五行 ${inyo.dayGogyo}・${inyo.dayInyo}　天中殺：${tenchuu}\n` +
    `・エネルギー：${yojo.uchuban.totalEnergy}／36　五行：強い ${strong}／無い ${weak}`;

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🔮 明日 ${dateLabel(date)} ／ あなたの日`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "生涯変わらない宿命（陰占・陽占）と、明日という日の巡りを掛け合わせています。",
        },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: selfLine },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*明日の過ごし方*\n${advice}`,
      },
    },
  ];
}

// ── 小物 ────────────────────────────────────────────────────

function infoDayLine(inyo: InyoResult): string {
  return `${inyo.dayKan}（${inyo.dayGogyo}・${inyo.dayInyo}）`;
}

function dateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

// 'YYYY-MM-DD' を年月日に分解。不正なら null。
function parseYmd(
  s: string,
): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

// owner_birthday は Supabase から 'YYYY-MM-DD' 文字列で来る想定。ISO 日時が来ても頭を拾う。
function parseBirthday(
  raw: string | null,
): { year: number; month: number; day: number } | null {
  if (!raw) return null;
  return parseYmd(raw.slice(0, 10));
}
