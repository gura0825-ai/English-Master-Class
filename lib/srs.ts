import { addDaysToDateString } from "@/lib/dates";

/**
 * 간격 반복(SRS) 규칙 — 복습 로직은 이 파일에만 둔다 (CLAUDE.md).
 * stage 0~6, stage 별 다음 복습까지 일수
 */
export const INTERVALS = [1, 3, 7, 14, 30, 60, 120] as const;
export const MAX_STAGE = INTERVALS.length - 1;

export const RATINGS = ["again", "hard", "good"] as const;
export type Rating = (typeof RATINGS)[number];

/** DB 값이 이상해도 계산이 깨지지 않게 0~6 정수로 맞춘다 */
function clampStage(stage: number): number {
  if (!Number.isFinite(stage)) return 0;
  return Math.min(Math.max(Math.trunc(stage), 0), MAX_STAGE);
}

/** 새 카드: stage 0, 다음 복습 = 내일 */
export function newCardSchedule(today: string) {
  return { stage: 0, next_review_date: addDaysToDateString(today, 1) };
}

/**
 * 평가에 따른 다음 단계와 며칠 뒤 복습할지
 * - good : stage + 1 (최대 6), 새 stage 의 간격
 * - hard : stage 유지, 현재 간격의 절반 (최소 1일)
 * - again: stage 0, 내일
 */
export function schedule(stage: number, rating: Rating): { stage: number; days: number } {
  const current = clampStage(stage);
  if (rating === "again") return { stage: 0, days: 1 };
  if (rating === "hard") {
    return { stage: current, days: Math.max(1, Math.floor(INTERVALS[current] / 2)) };
  }
  const next = Math.min(current + 1, MAX_STAGE);
  return { stage: next, days: INTERVALS[next] };
}

export type ReviewableCard = {
  stage: number;
  review_count: number;
  lapse_count: number;
};

/** 카드에 평가를 적용한 결과 (cards 갱신값 + reviews 기록값) */
export function applyReview(card: ReviewableCard, rating: Rating, today: string) {
  const stageBefore = clampStage(card.stage);
  const { stage, days } = schedule(stageBefore, rating);
  return {
    stage,
    next_review_date: addDaysToDateString(today, days),
    review_count: card.review_count + 1,
    lapse_count: card.lapse_count + (rating === "again" ? 1 : 0),
    stage_before: stageBefore,
    stage_after: stage,
    days,
  };
}
