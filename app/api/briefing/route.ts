import { NextRequest, NextResponse } from "next/server";
import { runEveningBriefing } from "@/lib/ai-clone/briefing";

// Vercel Cron は GET で叩く（毎晩 22:00 JST = UTC 13:00）
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const expectedAuth = cronSecret ? `Bearer ${cronSecret}` : null;

  if (expectedAuth && authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { result, delivery } = await runEveningBriefing();
    return NextResponse.json({
      ok: true,
      date: result.date,
      todayEventCount: result.todayEvents.length,
      tomorrowEventCount: result.tomorrowItems.length,
      todayNotesCount: result.todayNotes.length,
      delivery,
    });
  } catch (err) {
    console.error("[ai-clone] evening-briefing失敗:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}

// 手動テスト用
export async function POST() {
  try {
    const { result, delivery } = await runEveningBriefing();
    return NextResponse.json({ ok: true, result, delivery });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
