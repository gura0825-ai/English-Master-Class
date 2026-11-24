import { describe, expect, it } from "vitest";

import { sanitizeSearchTerm } from "./search";

describe("sanitizeSearchTerm", () => {
  it("필터 문법을 깨는 문자를 지운다", () => {
    expect(sanitizeSearchTerm("  break   the ice ")).toBe("break the ice");
    expect(sanitizeSearchTerm("a,b),id.eq.(x")).toBe("a b id.eq. x");
    expect(sanitizeSearchTerm("100%_*")).toBe("100");
    expect(sanitizeSearchTerm("don't")).toBe("don t");
    expect(sanitizeSearchTerm(undefined)).toBe("");
  });
});
