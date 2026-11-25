"use server";

import { z } from "zod";

import { todayInSeoul } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import { recordReview, type ReviewResult } from "@/lib/review/record";
import { verifyReviewToken } from "@/lib/review/token";
import { RATINGS, type Rating } from "@/lib/srs";
import { createAdminClient } from "@/lib/supabase/admin";

const inputSchema = z.object({
  token: z.string().max(200),
  cardId: z.uuid(),
  rating: z.enum(RATINGS),
});

/**
 * 메일 링크(/r/[token])에서 누른 평가 저장. POST(Server Action)로만 저장된다.
 * 토큰 주인의 카드 중 메일 보낸 날까지 복습 대상이던 카드만 평가할 수 있다.
 */
export async function submitEmailReview(token: string, cardId: string, rating: Rating): Promise<ReviewResult> {
  const parsed = inputSchema.safeParse({ token, cardId, rating });
  if (!parsed.success) return { ok: false, message: "잘못된 요청이에요." };

  const today = todayInSeoul();
  const check = verifyReviewToken(parsed.data.token, requireEnv("REVIEW_TOKEN_SECRET"), today);
  if (!check.ok) {
    return { ok: false, message: "링크가 만료되었어요. 로그인해서 복습해 주세요." };
  }

  return recordReview(createAdminClient(), {
    userId: check.userId,
    cardId: parsed.data.cardId,
    rating: parsed.data.rating,
    via: "email",
    today,
    dueBy: check.date,
  });
}
