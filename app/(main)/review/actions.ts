"use server";

import { z } from "zod";

import { todayInSeoul } from "@/lib/dates";
import { applyReview, RATINGS, type Rating } from "@/lib/srs";
import { describeDbError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type ReviewResult =
  | { ok: true; stage: number; next_review_date: string }
  | { ok: true; alreadyReviewed: true }
  | { ok: false; message: string };

const inputSchema = z.object({
  cardId: z.uuid(),
  rating: z.enum(RATINGS),
});

/**
 * 웹 플래시카드 평가 저장: cards 갱신 + reviews 기록.
 * 같은 카드를 두 번 누르거나 두 탭에서 동시에 평가해도 한 번만 반영된다.
 */
export async function submitReview(cardId: string, rating: Rating): Promise<ReviewResult> {
  const parsed = inputSchema.safeParse({ cardId, rating });
  if (!parsed.success) return { ok: false, message: "잘못된 요청이에요." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "로그인이 필요해요. 새로고침해 주세요." };

  const today = todayInSeoul();

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, stage, review_count, lapse_count, next_review_date")
    .eq("id", parsed.data.cardId)
    .maybeSingle();
  if (cardError) {
    console.error("[review] card select:", describeDbError(cardError));
    return { ok: false, message: "저장하지 못했어요. 다시 시도해 주세요." };
  }
  if (!card) return { ok: false, message: "카드를 찾을 수 없어요." };

  // 이미 오늘 이후로 밀려 있으면 방금 다른 곳에서 평가한 것
  if (card.next_review_date > today) return { ok: true, alreadyReviewed: true };

  const result = applyReview(card, parsed.data.rating, today);

  // 읽은 뒤 다른 곳에서 바뀌지 않았을 때만 갱신 (동시 평가 방지)
  const { data: updated, error: updateError } = await supabase
    .from("cards")
    .update({
      stage: result.stage,
      next_review_date: result.next_review_date,
      review_count: result.review_count,
      lapse_count: result.lapse_count,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", card.id)
    .eq("stage", card.stage)
    .eq("next_review_date", card.next_review_date)
    .select("id");
  if (updateError) {
    console.error("[review] card update:", describeDbError(updateError));
    return { ok: false, message: "저장하지 못했어요. 다시 시도해 주세요." };
  }
  if (!updated?.length) return { ok: true, alreadyReviewed: true };

  const { error: reviewError } = await supabase.from("reviews").insert({
    card_id: card.id,
    user_id: user.id,
    rating: parsed.data.rating,
    via: "web",
    stage_before: result.stage_before,
    stage_after: result.stage_after,
  });
  if (reviewError) {
    // 카드 일정은 이미 반영됨. 이력 한 줄만 빠지므로 화면은 진행시킨다
    console.error("[review] review insert:", describeDbError(reviewError));
  }

  return { ok: true, stage: result.stage, next_review_date: result.next_review_date };
}
