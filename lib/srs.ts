import { addDaysToDateString } from "@/lib/dates";

/**
 * 간격 반복(SRS) 규칙 — 복습 로직은 이 파일에만 둔다 (CLAUDE.md).
 * stage 0~6, stage 별 다음 복습까지 일수
 */
export const INTERVALS = [1, 3, 7, 14, 30, 60, 120] as const;
export const MAX_STAGE = INTERVALS.length - 1;

/** 새 카드: stage 0, 다음 복습 = 내일 */
export function newCardSchedule(today: string) {
  return { stage: 0, next_review_date: addDaysToDateString(today, 1) };
}
