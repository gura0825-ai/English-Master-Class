import { render } from "@react-email/components";

import { DailyReviewEmail, type DailyReviewEmailCard } from "@/emails/DailyReview";
import { daysBetween, formatDateKo, todayInSeoul } from "@/lib/dates";

export type EmailSourceCard = {
  expression: string;
  meaning: string;
  example: string | null;
  review_count: number;
  last_reviewed_at: string | null;
  created_at: string;
};

/** "첫 복습 · 1일 만에" / "3번째 · 7일 만에" — 마지막 복습(없으면 기록한 날)부터 오늘까지 */
export function reviewLabel(card: EmailSourceCard, today: string): string {
  const nth = card.review_count === 0 ? "첫 복습" : `${card.review_count + 1}번째`;
  const since = todayInSeoul(new Date(card.last_reviewed_at ?? card.created_at));
  const days = Math.max(0, daysBetween(since, today));
  return `${nth} · ${days === 0 ? "오늘 기록" : `${days}일 만에`}`;
}

/** "[English Master Class] 오늘의 복습 12개 · 11월 25일" */
export function dailyReviewSubject(count: number, today: string): string {
  const d = new Date(`${today}T00:00:00Z`);
  return `[English Master Class] 오늘의 복습 ${count}개 · ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

export async function renderDailyReviewEmail(params: {
  cards: EmailSourceCard[];
  today: string;
  reviewUrl: string;
  settingsUrl: string;
  totalDue: number;
}) {
  const { cards, today, reviewUrl, settingsUrl, totalDue } = params;
  const emailCards: DailyReviewEmailCard[] = cards.map((c) => ({
    expression: c.expression,
    meaning: c.meaning,
    example: c.example,
    label: reviewLabel(c, today),
  }));
  const element = DailyReviewEmail({
    dateLabel: formatDateKo(today, today),
    cards: emailCards,
    reviewUrl,
    settingsUrl,
    backlog: totalDue > cards.length ? totalDue : null,
  });
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: dailyReviewSubject(cards.length, today), html, text };
}
