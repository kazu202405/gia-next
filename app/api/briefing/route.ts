import { NextRequest, NextResponse } from "next/server";
import { runMorningBriefing } from "@/lib/ai-clone/briefing";

// Vercel Cron は GET で呼ぶ（毎朝 6:30 JST = UTC 21:30）
export async function GET(request: NextRequest) {
  // Cron認証：Vercel Cronヘッダーまたは独自シークレットを検証
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const expectedAuth = cronSecret ? `Bearer ${cronSecret}` : null;

  // CRON_SECRETが設定されてる時のみ厳密チェック（未設定時は手動テスト可）
  if (expectedAuth && authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { result, delivery } = await runMorningBriefing();
    return NextResponse.json({
      ok: true,
      date: result.date,
      eventCount: result.items.length,
      delivery,
      summary: result.summary,
    });
  } catch (err) {
    console.error("[ai-clone] briefing失敗:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// 開発時の手動テスト用：POSTでも同じ動作（Cronヘッダー不要）
export async function POST() {
  try {
    const { result, delivery } = await runMorningBriefing();
    return NextResponse.json({
      ok: true,
      result,
      delivery,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
