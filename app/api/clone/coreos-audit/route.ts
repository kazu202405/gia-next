// Core OS「棚卸し（健康診断）」API。
// AI が実際に参照している Core OS 全文（fetchExecutiveContext）を GPT に渡し、
// 重複・矛盾・陳腐化・抽象すぎ・肥大 を指摘＋直し方を提案させる。
// 書き込みはしない（提案を見て、本人が各セクションで手直しする）。

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAIClient, resolveModel } from "@/lib/openai/client";
import { fetchExecutiveContext } from "@/lib/ai-clone/supabase-db";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Finding {
  area: string;
  type: string; // duplicate | contradiction | stale | too_abstract | bloat
  title: string;
  detail: string;
  action: string; // keep | merge | rewrite | retire
  suggestion: string;
}

function sanitizeFindings(raw: unknown): Finding[] {
  if (!Array.isArray(raw)) return [];
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return raw
    .map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      return {
        area: str(o.area),
        type: str(o.type),
        title: str(o.title),
        detail: str(o.detail),
        action: str(o.action),
        suggestion: str(o.suggestion),
      };
    })
    .filter((f) => f.title || f.detail || f.suggestion)
    .slice(0, 8);
}

const AUDIT_SYSTEM = `あなたは経営者の右腕AIの「Core OS（判断軸の脳）」を点検するレビュアーです。
Core OS は AI が毎回参照する“憲法”なので、小さく・鋭く・最新に保つ必要があります。膨らみ・重複・陳腐化は AI の判断をぼやけさせます。
次の観点で監査し、改善提案を出してください：
- duplicate（重複）：似た内容が複数ある → 統合を提案
- contradiction（矛盾）：相反するルール
- stale（陳腐化）：古そう・今の実態と食い違いそう
- too_abstract（抽象的すぎ）：判断を変えない一般論・きれいごと（例「振り返りは大事」）
- bloat（肥大）：細かすぎて主軸を埋もれさせている
ネガティブな断定でなく「こう直すと効く」という前向きな提案に。書かれていない事実を創作しない。
出力は必ず次の JSON のみ：
{
  "overall": "全体総評（2〜3文。鋭さ・肥大の有無・最優先で直すべき1点）",
  "findings": [
    {
      "area": "対象セクション名（例：判断基準／ミッション／FAQ／口調ルール など）",
      "type": "duplicate|contradiction|stale|too_abstract|bloat",
      "title": "短い見出し",
      "detail": "何が気になるか（1〜2文）",
      "action": "keep|merge|rewrite|retire",
      "suggestion": "具体的にどう直すか（1〜2文）"
    }
  ]
}
findings は重要な順に最大8件。大きな問題が無ければ findings は空配列にし、overall で良好と伝える。`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  let body: { slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }
  const slug = (body.slug ?? "").trim();
  if (!slug) {
    return NextResponse.json({ error: "対象が不正です" }, { status: 400 });
  }

  // member 認可
  const { data: tenant } = await supabase
    .from("ai_clone_tenants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) {
    return NextResponse.json({ error: "テナントが見つかりません" }, { status: 404 });
  }
  const { data: member } = await supabase
    .from("ai_clone_tenant_members")
    .select("user_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json({ error: "AIが未設定です" }, { status: 503 });
  }

  const coreText = await fetchExecutiveContext(tenant.id);
  if (!coreText || coreText.trim().length < 20) {
    return NextResponse.json({
      overall:
        "Core OS がまだ十分に蓄積されていません。判断基準やルールが増えてきたら棚卸ししましょう。",
      findings: [],
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: resolveModel(),
      response_format: { type: "json_object" },
      max_tokens: 1200,
      messages: [
        { role: "system", content: AUDIT_SYSTEM },
        {
          role: "user",
          content: `# 現在の Core OS（AIが毎回参照している全文）\n${coreText}\n\n上記を監査し、指定の JSON で返してください。`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { overall?: unknown; findings?: unknown } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "棚卸しの生成に失敗しました" },
        { status: 500 }
      );
    }
    const overall =
      typeof parsed.overall === "string" ? parsed.overall.trim() : "";
    const findings = sanitizeFindings(parsed.findings);
    return NextResponse.json({ overall, findings });
  } catch (err) {
    console.error("[coreos-audit] 生成失敗:", err);
    return NextResponse.json(
      { error: "棚卸しの生成に失敗しました" },
      { status: 500 }
    );
  }
}
