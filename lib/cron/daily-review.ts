import "server-only";

import type { EmailSourceCard } from "@/lib/email/daily-review";
import { sendDailyReviewEmail } from "@/lib/email/send";
import { DEFAULT_DAILY_LIMIT } from "@/lib/review/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeDbError } from "@/lib/supabase/errors";

type Outcome = "sent" | "already_sent" | "no_cards" | "failed";

export type DailyReviewRunResult = {
  date: string;
  sent: number;
  skipped: number;
  failed: number;
  users: { user: string; outcome: Outcome; cards?: number; error?: string }[];
};

/**
 * 매일 아침 복습 메일 (CLAUDE.md Email 절)
 * 1) email_enabled 인 사용자마다 2) 오늘 이미 보냈으면 건너뛰고
 * 3) 오늘(KST) 볼 카드가 있을 때만 4) Resend 로 보내고 email_logs 에 남긴다.
 * service role 클라이언트이므로 모든 조회에 user_id 조건을 직접 건다.
 */
export async function runDailyReview(today: string): Promise<DailyReviewRunResult> {
  const admin = createAdminClient();
  const result: DailyReviewRunResult = { date: today, sent: 0, skipped: 0, failed: 0, users: [] };

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, email, daily_limit")
    .eq("email_enabled", true)
    .neq("email", "");
  if (profilesError) throw new Error(`profiles: ${describeDbError(profilesError)}`);

  const { data: sentLogs, error: logsError } = await admin
    .from("email_logs")
    .select("user_id")
    .eq("sent_date", today)
    .eq("status", "sent");
  if (logsError) throw new Error(`email_logs: ${describeDbError(logsError)}`);
  const alreadySent = new Set((sentLogs ?? []).map((l) => l.user_id as string));

  for (const profile of profiles ?? []) {
    const user = (profile.id as string).slice(0, 8); // 로그에는 id 앞부분만

    if (alreadySent.has(profile.id)) {
      result.skipped++;
      result.users.push({ user, outcome: "already_sent" });
      continue;
    }

    const limit = profile.daily_limit ?? DEFAULT_DAILY_LIMIT;
    const [cardsRes, countRes] = await Promise.all([
      admin
        .from("cards")
        .select("expression, meaning, example, review_count, last_reviewed_at, created_at")
        .eq("user_id", profile.id)
        .lte("next_review_date", today)
        .order("next_review_date", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(limit)
        .returns<EmailSourceCard[]>(),
      admin
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .lte("next_review_date", today),
    ]);
    if (cardsRes.error) {
      result.failed++;
      result.users.push({ user, outcome: "failed", error: describeDbError(cardsRes.error) });
      continue;
    }
    const cards = cardsRes.data ?? [];
    if (cards.length === 0) {
      // 볼 카드가 없으면 보내지도, 기록하지도 않는다 (같은 날 다시 실행해도 안전)
      result.skipped++;
      result.users.push({ user, outcome: "no_cards" });
      continue;
    }

    const send = await sendDailyReviewEmail({
      userId: profile.id,
      to: profile.email,
      today,
      cards,
      totalDue: countRes.count ?? cards.length,
      idempotencyKey: `daily-review/${profile.id}/${today}`,
    });

    // 실패도 남겨 두고, 같은 날 다시 실행하면 재시도한다(성공 기록만 건너뜀)
    const { error: logError } = await admin.from("email_logs").upsert(
      {
        user_id: profile.id,
        sent_date: today,
        card_count: cards.length,
        status: send.ok ? "sent" : "failed",
        provider_message_id: send.ok ? send.id : null,
      },
      { onConflict: "user_id,sent_date" }
    );
    if (logError) console.error("[cron] email_logs upsert:", describeDbError(logError));

    if (send.ok) {
      result.sent++;
      result.users.push({ user, outcome: "sent", cards: cards.length });
    } else {
      result.failed++;
      result.users.push({ user, outcome: "failed", cards: cards.length, error: send.error });
    }

    // Resend 무료 플랜 초당 요청 제한 여유
    await new Promise((r) => setTimeout(r, 600));
  }

  return result;
}
