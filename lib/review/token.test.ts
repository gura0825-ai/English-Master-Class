import { describe, expect, it } from "vitest";

import { createReviewToken, verifyReviewToken } from "./token";

const secret = "test-secret-very-long";
const userId = "11111111-2222-4333-8444-555555555555";

describe("review token", () => {
  const token = createReviewToken(userId, "2026-11-25", secret);

  it("보낸 날부터 3일(당일·+1·+2)까지 유효", () => {
    expect(verifyReviewToken(token, secret, "2026-11-25")).toEqual({ ok: true, userId, date: "2026-11-25" });
    expect(verifyReviewToken(token, secret, "2026-11-27").ok).toBe(true);
    expect(verifyReviewToken(token, secret, "2026-11-28")).toEqual({ ok: false, reason: "expired" });
  });

  it("보낸 날보다 이른 날짜(미래 토큰)는 거부", () => {
    expect(verifyReviewToken(token, secret, "2026-11-24")).toEqual({ ok: false, reason: "expired" });
  });

  it("다른 비밀키·위조·변조는 invalid", () => {
    expect(verifyReviewToken(token, "other-secret", "2026-11-25").ok).toBe(false);
    const [, , sig] = token.split(".");
    const otherUser = "99999999-2222-4333-8444-555555555555";
    expect(verifyReviewToken(`${otherUser}.2026-11-25.${sig}`, secret, "2026-11-25")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(verifyReviewToken(`${userId}.2026-11-26.${sig}`, secret, "2026-11-26").ok).toBe(false);
    expect(verifyReviewToken(token.slice(0, -2), secret, "2026-11-25").ok).toBe(false);
    expect(verifyReviewToken("garbage", secret, "2026-11-25").ok).toBe(false);
    expect(verifyReviewToken(`${userId}.2026-02-30.${sig}`, secret, "2026-02-28").ok).toBe(false);
    expect(verifyReviewToken(token, "", "2026-11-25").ok).toBe(false);
  });

  it("URL 경로에 그대로 넣을 수 있는 문자만 쓴다", () => {
    expect(token).toMatch(/^[0-9a-f-]+\.\d{4}-\d{2}-\d{2}\.[A-Za-z0-9_-]+$/);
  });
});
