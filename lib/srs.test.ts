import { describe, expect, it } from "vitest";

import { INTERVALS, MAX_STAGE, newCardSchedule } from "./srs";

describe("SRS 상수", () => {
  it("간격은 CLAUDE.md 와 같다", () => {
    expect(INTERVALS).toEqual([1, 3, 7, 14, 30, 60, 120]);
    expect(MAX_STAGE).toBe(6);
  });
});

describe("newCardSchedule", () => {
  it("새 카드는 stage 0, 다음 복습은 내일", () => {
    expect(newCardSchedule("2026-11-24")).toEqual({ stage: 0, next_review_date: "2026-11-25" });
    expect(newCardSchedule("2026-12-31")).toEqual({ stage: 0, next_review_date: "2027-01-01" });
  });
});
