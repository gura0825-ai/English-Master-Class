import { createHmac, timingSafeEqual } from "node:crypto";

import { daysBetween, isDateString } from "@/lib/dates";

/** 메일 평가 링크 유효 기간: 보낸 날 포함 3일 */
export const TOKEN_VALID_DAYS = 3;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sign(userId: string, date: string, secret: string): string {
  return createHmac("sha256", secret).update(`review:${userId}:${date}`).digest("base64url");
}

/** token = `{user_id}.{yyyy-MM-dd}.{HMAC}` — 로그인 없이 그날 카드만 평가할 수 있는 열쇠 */
export function createReviewToken(userId: string, date: string, secret: string): string {
  if (!secret) throw new Error("REVIEW_TOKEN_SECRET is empty");
  return `${userId}.${date}.${sign(userId, date, secret)}`;
}

export type TokenCheck =
  | { ok: true; userId: string; date: string }
  | { ok: false; reason: "invalid" | "expired" };

/** 서명이 맞고, 보낸 날(date)부터 3일 안(오늘이 date ~ date+2)일 때만 통과 */
export function verifyReviewToken(token: string, secret: string, today: string): TokenCheck {
  if (!secret) return { ok: false, reason: "invalid" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "invalid" };
  const [userId, date, signature] = parts;
  if (!UUID_RE.test(userId) || !isDateString(date)) return { ok: false, reason: "invalid" };

  const expected = Buffer.from(sign(userId, date, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: "invalid" };
  }

  const age = daysBetween(date, today);
  if (age < 0 || age >= TOKEN_VALID_DAYS) return { ok: false, reason: "expired" };
  return { ok: true, userId: userId.toLowerCase(), date };
}
