// 紹介コーチ chat の API route（Phase C: 実 OpenAI 接続 + streaming）。
//
// 役割:
//   1. ログインユーザーを認可（applicants にいることを確認）
//   2. ユーザーの紹介設計ワークシート + applicants 抜粋を読む
//   3. system prompt を動的に組み立て（lib/coach/system-prompt.ts）
//   4. OpenAI Chat Completions（stream: true）に投げ、トークンを順次返す
//
// レスポンス形式:
//   text/plain で生のテキストチャンクを順次 enqueue。
//   クライアント側 (CoachChat) は ReadableStream を逐次読み取り、
//   assistant メッセージの content を inkremental に書き換える。
//
// 環境変数:
//   - OPENAI_API_KEY  必須（lib/openai/client.ts で集約）
//   - OPENAI_MODEL    任意（同上、未指定なら gpt-4o-mini）
//
// Runtime:
//   nodejs を明示。Supabase server client + openai SDK の安定実行のため。

import { createClient } from "@/lib/supabase/server";
import { loadWorksheet } from "@/lib/coach/worksheet-storage";
import { buildSystemPrompt } from "@/lib/coach/system-prompt";
import { getOpenAIClient, resolveModel } from "@/lib/openai/client";

export const runtime = "nodejs";
// AI 応答は streaming で 30 秒超になり得るため、関数の最大実行時間を伸ばす。
export const maxDuration = 60;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  // 1. 認可
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. リクエストボディ
  let body: { messages?: IncomingMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
  // 念のため: greeting メッセージ（既知の固定文言）が混ざっても system に重複させない。
  // クライアント側で送らない設計だが、防御として弾く。
  const userMessages = incomingMessages.filter(
    (m) =>
      m &&
      typeof m.content === "string" &&
      m.content.trim().length > 0 &&
      (m.role === "user" || m.role === "assistant"),
  );

  if (userMessages.length === 0) {
    return new Response("No messages", { status: 400 });
  }

  // 3. ユーザー文脈の取得（並列）
  const [worksheet, applicantRes] = await Promise.all([
    loadWorksheet(supabase, user.id),
    supabase
      .from("applicants")
      .select("name, nickname, services_summary")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const applicant = applicantRes.data as
    | { name: string | null; nickname: string | null; services_summary: string | null }
    | null;

  const callName =
    applicant?.nickname?.trim() || applicant?.name?.trim() || null;
  const servicesSummary = applicant?.services_summary?.trim() || null;

  // 4. system prompt 構築
  const systemPrompt = buildSystemPrompt({
    callName,
    servicesSummary,
    worksheet,
  });

  // 5. OpenAI streaming
  const openai = getOpenAIClient();
  if (!openai) {
    return new Response(
      "OpenAI が未設定です。OPENAI_API_KEY を環境変数に追加してください。",
      { status: 503 },
    );
  }
  const stream = await openai.chat.completions.create({
    model: resolveModel(),
    messages: [
      { role: "system", content: systemPrompt },
      ...userMessages.map((m) => ({ role: m.role, content: m.content })),
    ],
    stream: true,
    temperature: 0.7,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (err) {
        // streaming 中の失敗はエラーマークを末尾に流して閉じる
        console.error("[coach/chat] stream error:", err);
        controller.enqueue(
          encoder.encode("\n\n[エラー：応答の生成中に問題が発生しました]"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
