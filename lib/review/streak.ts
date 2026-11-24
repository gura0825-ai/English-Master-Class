import { addDaysToDateString } from "@/lib/dates";

/**
 * 연속 학습일. 오늘 공부했으면 오늘부터, 아직이면 어제부터 거꾸로 센다
 * (오늘 아직 안 했다고 연속 기록이 끊긴 것으로 보지 않는다).
 * @param days 공부한 날('yyyy-MM-dd') 목록 — 순서·중복 상관없음
 */
export function computeStreak(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDaysToDateString(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDaysToDateString(cursor, -1);
  }
  return streak;
}
