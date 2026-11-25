import { NextResponse, type NextRequest } from "next/server";

import { isAuthorizedCron } from "@/lib/cron/auth";
import { runDailyReview } from "@/lib/cron/daily-review";
import { todayInSeoul } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel Cron: vercel.json "0 22 * * *" (UTC 22시 = KST 07시대)
 * 로컬 테스트: curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-review
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyReview(todayInSeoul());
    console.log("[cron] daily-review:", JSON.stringify(result));
    return NextResponse.json(result, { status: result.failed > 0 ? 207 : 200 });
  } catch (error) {
    console.error("[cron] daily-review failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "unknown error" },
      { status: 500 }
    );
  }
}
