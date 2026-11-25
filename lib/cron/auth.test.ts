import { describe, expect, it } from "vitest";

import { isAuthorizedCron } from "./auth";

describe("isAuthorizedCron", () => {
  it("Bearer 비밀값이 정확히 같을 때만 통과", () => {
    expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorizedCron("Bearer s3cre", "s3cret")).toBe(false);
    expect(isAuthorizedCron("s3cret", "s3cret")).toBe(false);
    expect(isAuthorizedCron(null, "s3cret")).toBe(false);
  });
  it("서버에 비밀값이 없으면 항상 거부", () => {
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
  });
});
