import { describe, expect, it } from "vitest";

import { computeStreak } from "./streak";

const today = "2026-11-24";

describe("computeStreak", () => {
  it("오늘 포함 연속 일수", () => {
    expect(computeStreak(["2026-11-24", "2026-11-23", "2026-11-22", "2026-11-20"], today)).toBe(3);
  });
  it("오늘 아직 안 했으면 어제까지 이어진 일수", () => {
    expect(computeStreak(["2026-11-23", "2026-11-22"], today)).toBe(2);
  });
  it("어제도 안 했으면 0", () => {
    expect(computeStreak(["2026-11-22", "2026-11-21"], today)).toBe(0);
    expect(computeStreak([], today)).toBe(0);
  });
  it("월·연 경계와 중복", () => {
    expect(computeStreak(["2027-01-01", "2026-12-31", "2026-12-31", "2026-12-30"], "2027-01-01")).toBe(3);
  });
});
