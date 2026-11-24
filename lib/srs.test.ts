import { describe, expect, it } from "vitest";

import { applyReview, INTERVALS, MAX_STAGE, newCardSchedule, schedule } from "./srs";

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

describe("schedule — good (기억남)", () => {
  it("다음 stage 로 올라가고 새 stage 의 간격만큼 뒤", () => {
    expect(schedule(0, "good")).toEqual({ stage: 1, days: 3 });
    expect(schedule(1, "good")).toEqual({ stage: 2, days: 7 });
    expect(schedule(2, "good")).toEqual({ stage: 3, days: 14 });
    expect(schedule(3, "good")).toEqual({ stage: 4, days: 30 });
    expect(schedule(4, "good")).toEqual({ stage: 5, days: 60 });
    expect(schedule(5, "good")).toEqual({ stage: 6, days: 120 });
  });
  it("stage 6(졸업)에서는 6 유지, 120일마다", () => {
    expect(schedule(6, "good")).toEqual({ stage: 6, days: 120 });
  });
});

describe("schedule — hard (헷갈림)", () => {
  it("stage 유지, 현재 간격의 절반(내림), 최소 1일", () => {
    expect(schedule(0, "hard")).toEqual({ stage: 0, days: 1 }); // floor(1/2)=0 → 1
    expect(schedule(1, "hard")).toEqual({ stage: 1, days: 1 }); // floor(3/2)=1
    expect(schedule(2, "hard")).toEqual({ stage: 2, days: 3 }); // floor(7/2)=3
    expect(schedule(3, "hard")).toEqual({ stage: 3, days: 7 });
    expect(schedule(4, "hard")).toEqual({ stage: 4, days: 15 });
    expect(schedule(5, "hard")).toEqual({ stage: 5, days: 30 });
    expect(schedule(6, "hard")).toEqual({ stage: 6, days: 60 });
  });
});

describe("schedule — again (모름)", () => {
  it("어느 stage 든 0 으로, 내일", () => {
    for (let s = 0; s <= 6; s++) expect(schedule(s, "again")).toEqual({ stage: 0, days: 1 });
  });
});

describe("schedule — 이상한 stage 값", () => {
  it("범위 밖·소수는 0~6 정수로 맞춘다", () => {
    expect(schedule(-3, "good")).toEqual({ stage: 1, days: 3 });
    expect(schedule(99, "good")).toEqual({ stage: 6, days: 120 });
    expect(schedule(2.7, "hard")).toEqual({ stage: 2, days: 3 });
    expect(schedule(Number.NaN, "good")).toEqual({ stage: 1, days: 3 });
  });
});

describe("applyReview", () => {
  const card = { stage: 2, review_count: 4, lapse_count: 1 };
  const today = "2026-11-24";

  it("good: 다음 복습일·횟수 갱신, lapse 그대로", () => {
    expect(applyReview(card, "good", today)).toEqual({
      stage: 3,
      next_review_date: "2026-12-08",
      review_count: 5,
      lapse_count: 1,
      stage_before: 2,
      stage_after: 3,
      days: 14,
    });
  });

  it("hard: stage 유지, 절반 간격", () => {
    expect(applyReview(card, "hard", today)).toMatchObject({
      stage: 2,
      next_review_date: "2026-11-27",
      review_count: 5,
      lapse_count: 1,
    });
  });

  it("again: stage 0, 내일, lapse_count + 1", () => {
    expect(applyReview(card, "again", today)).toMatchObject({
      stage: 0,
      next_review_date: "2026-11-25",
      review_count: 5,
      lapse_count: 2,
      stage_before: 2,
      stage_after: 0,
    });
  });

  it("한 번도 안 틀리면 1→4→11→25→55→115일째에 복습하고 졸업 (설계서 6장 표)", () => {
    let c = { stage: 0, review_count: 0, lapse_count: 0 };
    let day = "2026-11-24"; // 기록한 날
    let date = newCardSchedule(day).next_review_date;
    const reviewDays: string[] = [];
    for (let i = 0; i < 6; i++) {
      reviewDays.push(date);
      const r = applyReview(c, "good", date);
      c = { stage: r.stage, review_count: r.review_count, lapse_count: r.lapse_count };
      day = date;
      date = r.next_review_date;
    }
    expect(reviewDays).toEqual([
      "2026-11-25", // 1일째
      "2026-11-28", // 4일째
      "2026-12-05", // 11일째
      "2026-12-19", // 25일째
      "2027-01-18", // 55일째
      "2027-03-19", // 115일째
    ]);
    expect(c.stage).toBe(6);
    expect(day).toBe("2027-03-19");
  });
});
