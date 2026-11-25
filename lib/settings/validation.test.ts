import { describe, expect, it } from "vitest";

import { settingsSchema } from "./validation";

describe("settingsSchema", () => {
  it("체크박스와 숫자를 변환한다", () => {
    expect(settingsSchema.parse({ email_enabled: "on", daily_limit: "30" })).toEqual({
      email_enabled: true,
      daily_limit: 30,
    });
    expect(settingsSchema.parse({ email_enabled: null, daily_limit: "1" })).toEqual({
      email_enabled: false,
      daily_limit: 1,
    });
  });
  it("범위 밖·소수·문자는 거부", () => {
    for (const v of ["0", "201", "2.5", "abc", ""]) {
      expect(settingsSchema.safeParse({ email_enabled: "on", daily_limit: v }).success, v).toBe(false);
    }
  });
});
