import { NextRequest, NextResponse } from "next/server";
import { runMorningBriefing } from "@/lib/ai-clone/morning-briefing";

// Vercel Cron は GET で叩く。
// schedule: "0 21 * * *" = 毎日 UTC 21:00 = JST 6:00。
// 2026-05-17: 夜22時の evening briefing（Notion 依存で壊れていた）から、
//            朝6時の占い系 morning briefing に置き換え。
//            morning_briefing_enabled = true のテナントだけが対象。
//            旧 runEveningBriefing は lib/ai-clone/briefing.ts に残置（参照されない）。
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const expectedAuth = cronSecret ? `Bearer ${cronSecret}` : null;

  if (expectedAuth && authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runMorningBriefing();
    return NextResponse.json({
      ok: true,
      date: result.date,
      deliveryCount: result.deliveries.length,
      deliveries: result.deliveries,
    });
  } catch (err) {
    console.error("[morning-briefing] 失敗:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

// 手動テスト用（CRON_SECRET 未設定でも叩ける）
export async function POST() {
  try {
    const result = await runMorningBriefing();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
