import "server-only";

import { Resend } from "resend";

import { getAppUrl, requireEnv } from "@/lib/env";
import { createReviewToken } from "@/lib/review/token";

import { renderDailyReviewEmail, type EmailSourceCard } from "./daily-review";

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

/** 그날의 복습 메일 한 통 보내기 (cron 과 설정 화면의 '테스트 메일'이 함께 쓴다) */
export async function sendDailyReviewEmail(params: {
  userId: string;
  to: string;
  today: string;
  cards: EmailSourceCard[];
  totalDue: number;
  /** 같은 키로 다시 보내면 Resend 가 중복 발송하지 않는다(24시간) */
  idempotencyKey?: string;
}): Promise<SendResult> {
  const { userId, to, today, cards, totalDue, idempotencyKey } = params;
  const appUrl = getAppUrl();
  const token = createReviewToken(userId, today, requireEnv("REVIEW_TOKEN_SECRET"));

  const { subject, html, text } = await renderDailyReviewEmail({
    cards,
    today,
    totalDue,
    reviewUrl: `${appUrl}/r/${token}`,
    settingsUrl: `${appUrl}/settings`,
  });

  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const { data, error } = await resend.emails.send(
    { from: requireEnv("EMAIL_FROM"), to, subject, html, text },
    idempotencyKey ? { idempotencyKey } : undefined
  );
  if (error) return { ok: false, error: `${error.name}: ${error.message}` };
  return { ok: true, id: data?.id ?? null };
}
