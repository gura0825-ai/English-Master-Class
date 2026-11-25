"use server";

import { z } from "zod";

import { todayInSeoul } from "@/lib/dates";
import { recordReview, type ReviewResult } from "@/lib/review/record";
import { RATINGS, type Rating } from "@/lib/srs";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  cardId: z.uuid(),
  rating: z.enum(RATINGS),
});

/** 웹 플래시카드 평가 저장 (로그인 사용자 권한, RLS 적용) */
export async function submitReview(cardId: string, rating: Rating): Promise<ReviewResult> {
  const parsed = inputSchema.safeParse({ cardId, rating });
  if (!parsed.success) return { ok: false, message: "잘못된 요청이에요." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요해요. 새로고침해 주세요." };

  const today = todayInSeoul();
  return recordReview(supabase, {
    userId: user.id,
    cardId: parsed.data.cardId,
    rating: parsed.data.rating,
    via: "web",
    today,
    dueBy: today,
  });
}
