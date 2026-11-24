import { describe, expect, it } from "vitest";

import {
  addDaysToDateString,
  daysBetween,
  formatDateKo,
  isDateString,
  relativeDayKo,
  todayInSeoul,
} from "./dates";

describe("todayInSeoul", () => {
  it("UTC 15:00 이후는 서울에서 다음 날", () => {
    expect(todayInSeoul(new Date("2026-11-23T14:59:59Z"))).toBe("2026-11-23");
    expect(todayInSeoul(new Date("2026-11-23T15:00:00Z"))).toBe("2026-11-24");
  });
  it("Cron 시각(UTC 22시)은 서울 다음 날 07시", () => {
    expect(todayInSeoul(new Date("2026-11-23T22:00:00Z"))).toBe("2026-11-24");
  });
});

describe("addDaysToDateString", () => {
  it("월말·연말·윤년을 넘긴다", () => {
    expect(addDaysToDateString("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDaysToDateString("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateString("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysToDateString("2026-11-24", 120)).toBe("2027-03-24");
  });
});

describe("isDateString", () => {
  it("실제 있는 날짜만 통과", () => {
    expect(isDateString("2026-11-24")).toBe(true);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("2026-1-5")).toBe(false);
    expect(isDateString("")).toBe(false);
  });
});

describe("표시용", () => {
  it("daysBetween", () => {
    expect(daysBetween("2026-11-24", "2026-11-27")).toBe(3);
    expect(daysBetween("2026-11-24", "2026-11-22")).toBe(-2);
  });
  it("formatDateKo", () => {
    expect(formatDateKo("2026-11-24", "2026-11-24")).toBe("11월 24일 (화)");
    expect(formatDateKo("2027-01-01", "2026-11-24")).toBe("2027년 1월 1일 (금)");
  });
  it("relativeDayKo", () => {
    const today = "2026-11-24";
    expect(relativeDayKo("2026-11-24", today)).toBe("오늘");
    expect(relativeDayKo("2026-11-25", today)).toBe("내일");
    expect(relativeDayKo("2026-11-27", today)).toBe("3일 후");
    expect(relativeDayKo("2026-11-22", today)).toBe("2일 지남");
  });
});
