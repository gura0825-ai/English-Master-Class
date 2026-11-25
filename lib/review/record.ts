import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { applyReview, type Rating } from "@/lib/srs";
import { describeDbError } from "@/lib/supabase/errors";

export type ReviewResult =
  | { ok: true; stage: number; next_review_date: string }
  | { ok: true; alreadyReviewed: true }
  | { ok: false; message: string };

/**
 * 평가 한 번을 저장한다: cards 갱신 + reviews 기록.
 * 웹(로그인 사용자 클라이언트, RLS)과 메일(/r/[token], service role) 모두 이 함수를 쓴다.
 *
 * - dueBy: 이 날짜까지 복습 대상이던 카드만 평가 (웹 = 오늘, 메일 = 메일 보낸 날)
 * - 이미 그 뒤로 밀려 있으면 다른 곳에서 평가한 것으로 보고 무시한다
 * - update 는 읽은 stage·next_review_date 가 그대로일 때만 (동시 평가 방지)
 */
export async function recordReview(
  supabase: SupabaseClient,
  params: { userId: string; cardId: string; rating: Rating; via: "web" | "email"; today: string; dueBy: string }
): Promise<ReviewResult> {
  const { userId, cardId, rating, via, today, dueBy } = params;

  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, stage, review_count, lapse_count, next_review_date")
    .eq("id", cardId)
    .eq("user_id", userId) // service role 은 RLS 가 없으므로 주인을 직접 확인
    .maybeSingle();
  if (cardError) {
    console.error(`[review:${via}] card select:`, describeDbError(cardError));
    return { ok: false, message: "저장하지 못했어요. 다시 시도해 주세요." };
  }
  if (!card) return { ok: false, message: "카드를 찾을 수 없어요." };
  if (card.next_review_date > dueBy) return { ok: true, alreadyReviewed: true };

  const result = applyReview(card, rating, today);

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
    .eq("user_id", userId)
    .eq("stage", card.stage)
    .eq("next_review_date", card.next_review_date)
    .select("id");
  if (updateError) {
    console.error(`[review:${via}] card update:`, describeDbError(updateError));
    return { ok: false, message: "저장하지 못했어요. 다시 시도해 주세요." };
  }
  if (!updated?.length) return { ok: true, alreadyReviewed: true };

  const { error: reviewError } = await supabase.from("reviews").insert({
    card_id: card.id,
    user_id: userId,
    rating,
    via,
    stage_before: result.stage_before,
    stage_after: result.stage_after,
  });
  if (reviewError) {
    // 카드 일정은 이미 반영됨. 이력 한 줄만 빠지므로 화면은 진행시킨다
    console.error(`[review:${via}] review insert:`, describeDbError(reviewError));
  }

  return { ok: true, stage: result.stage, next_review_date: result.next_review_date };
}
