import { formatInTimeZone } from "date-fns-tz";

/** 앱의 모든 '오늘'은 이 시간대 기준 */
export const APP_TIME_ZONE = "Asia/Seoul";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 'yyyy-MM-dd' 형식이고 실제로 있는 날짜인지 */
export function isDateString(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** 서울 기준 오늘 날짜 ('yyyy-MM-dd'). 서버가 UTC여도 맞게 나온다 */
export function todayInSeoul(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TIME_ZONE, "yyyy-MM-dd");
}

/** 'yyyy-MM-dd' 에 days 일을 더한다 (달력 계산만, 시간대 영향 없음) */
export function addDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 두 날짜 사이 일수 (to - from) */
export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** '2026-11-24' → '11월 24일 (화)', 올해가 아니면 연도도 붙인다 */
export function formatDateKo(date: string, today: string = todayInSeoul()): string {
  const d = new Date(`${date}T00:00:00Z`);
  const md = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEKDAYS[d.getUTCDay()]})`;
  return date.slice(0, 4) === today.slice(0, 4) ? md : `${d.getUTCFullYear()}년 ${md}`;
}

/** 오늘 기준 상대 표현: 오늘 / 내일 / 3일 후 / 2일 지남 */
export function relativeDayKo(date: string, today: string = todayInSeoul()): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === -1) return "어제";
  return diff > 0 ? `${diff}일 후` : `${-diff}일 지남`;
}
