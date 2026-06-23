// 売上ボトルネック診断の送信エンドポイント。
//   1) 回答を採点（サーバ側で再計算＝保存値の整合を担保）
//   2) GPT(gpt-4o-mini) で結果に沿った簡易アドバイスを生成
//   3) 名前・メール・回答・スコア・アドバイスを Supabase に保存（service_role）
// いずれの外部処理（GPT/保存）が落ちても、結果自体は必ず返す。

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOpenAIClient, resolveModel } from "@/lib/openai/client";
import { scoreDiagnosis, type Answers } from "@/lib/diagnosis/score";

export const runtime = "nodejs";
export const maxDuration = 60;

function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[diagnosis] Supabase service role 未設定。保存をスキップします。");
    return null;
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  let body: {
    name?: string;
    email?: string;
    company?: string;
    industry?: string;
    worry?: string;
    answers?: Answers;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const company = (body.company ?? "").trim();
  const industry = (body.industry ?? "").trim();
  const worry = (body.worry ?? "").trim();
  const answers = body.answers;

  if (!name || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "お名前と正しいメールアドレスを入力してください" },
      { status: 400 }
    );
  }
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "回答が不正です" }, { status: 400 });
  }

  const result = scoreDiagnosis(answers);

  // ─── GPT 簡易アドバイス（落ちても続行） ───
  let advice: string | null = null;
  const client = getOpenAIClient();
  if (client) {
    try {
      const dimLines = result.dimensions
        .map((d) => `・${d.title}（${d.subtitle}）：${d.score}点 ${d.grade}`)
        .join("\n");
      const completion = await client.chat.completions.create({
        model: resolveModel(),
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content:
              "あなたは中小企業・個人事業の売上改善に強い実務家コンサルタントです。専門用語を避け、具体的で、温かく、しかし率直に助言します。売り込みは一切しません。出力は日本語のプレーンテキスト（見出し記号や箇条書き記号は使わない）で、300字程度。診断はざっくり推定であることを踏まえ、断定しすぎないこと。",
          },
          {
            role: "user",
            content: `次の診断結果をもとに、この方への簡易アドバイスを書いてください。

業種: ${industry || "不明"}
総合: ${result.total}点 ${result.grade}
${dimLines}
最大のボトルネック: ${result.bottleneck.title}
判定: ${result.verdict}
まず打つ一手の方向: ${result.firstMove}
本人の悩み: ${worry || "（記入なし）"}

内容は (1) このボトルネックがなぜ今いちばん効くのかを一言、(2) 今週からできる具体的な一歩を1〜2つ、(3) 最後にひと言励ます、の流れで。`,
          },
        ],
      });
      advice = completion.choices[0]?.message?.content?.trim() || null;
    } catch (err) {
      console.error("[diagnosis] アドバイス生成失敗:", err);
    }
  }

  // ─── Supabase 保存（落ちても続行） ───
  const admin = adminSupabase();
  if (admin) {
    const scores = Object.fromEntries(
      result.dimensions.map((d) => [d.key, d.score])
    );
    const { error } = await admin.from("diagnosis_submissions").insert({
      name,
      email,
      company: company || null,
      industry: industry || null,
      answers,
      scores,
      total: result.total,
      grade: result.grade,
      bottleneck_key: result.bottleneck.key,
      supply_gate: result.supplyGate,
      worry: worry || null,
      ai_advice: advice,
    });
    if (error) console.error("[diagnosis] 保存失敗:", error.message);
  }

  return NextResponse.json({ result, advice });
}
