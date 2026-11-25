import { describe, expect, it } from "vitest";

import { dailyReviewSubject, renderDailyReviewEmail, reviewLabel } from "./daily-review";

const today = "2026-11-25";
const base = { expression: "x", meaning: "y", example: null };

describe("reviewLabel", () => {
  it("첫 복습은 기록한 날(서울 기준)부터", () => {
    // 2026-11-24 15:30 UTC = 11-25 00:30 KST → 오늘 기록
    expect(reviewLabel({ ...base, review_count: 0, last_reviewed_at: null, created_at: "2026-11-24T15:30:00Z" }, today)).toBe("첫 복습 · 오늘 기록");
    expect(reviewLabel({ ...base, review_count: 0, last_reviewed_at: null, created_at: "2026-11-24T03:00:00Z" }, today)).toBe("첫 복습 · 1일 만에");
  });
  it("n번째는 마지막 복습부터", () => {
    expect(
      reviewLabel({ ...base, review_count: 2, last_reviewed_at: "2026-11-18T01:00:00Z", created_at: "2026-11-01T00:00:00Z" }, today)
    ).toBe("3번째 · 7일 만에");
  });
});

describe("dailyReviewSubject", () => {
  it("설계서 형식", () => {
    expect(dailyReviewSubject(12, "2026-11-24")).toBe("[English Master Class] 오늘의 복습 12개 · 11월 24일");
  });
});

describe("renderDailyReviewEmail", () => {
  it("카드·링크·밀린 수가 들어가고 HTML 은 이스케이프된다", async () => {
    const { subject, html, text } = await renderDailyReviewEmail({
      today,
      reviewUrl: "https://app.example.com/r/abc.2026-11-25.sig",
      settingsUrl: "https://app.example.com/settings",
      totalDue: 45,
      cards: [
        {
          expression: "break the ice",
          meaning: "어색함을 깨다",
          example: "Let's <b>break</b> the ice.",
          review_count: 0,
          last_reviewed_at: null,
          created_at: "2026-11-24T03:00:00Z",
        },
      ],
    });
    expect(subject).toBe("[English Master Class] 오늘의 복습 1개 · 11월 25일");
    expect(html).toContain("break the ice");
    expect(html).toContain("어색함을 깨다");
    expect(html).toContain('href="https://app.example.com/r/abc.2026-11-25.sig"');
    expect(html).toContain('href="https://app.example.com/settings"');
    expect(html).toContain("밀린 카드 45개");
    expect(html).not.toContain("<b>break</b>");
    expect(text).toContain("break the ice");
    expect(text).toContain("https://app.example.com/r/abc.2026-11-25.sig");
  });
});
