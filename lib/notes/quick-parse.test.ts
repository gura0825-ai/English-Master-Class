import { describe, expect, it } from "vitest";

import { guessCardType, parseQuickInput } from "./quick-parse";

describe("parseQuickInput", () => {
  it("'표현 — 뜻' 줄을 카드로 나눈다", () => {
    const { cards, invalidLines } = parseQuickInput(
      ["break the ice — 어색함을 깨다", "", "  serendipity – 뜻밖의 행운  "].join("\n")
    );
    expect(invalidLines).toEqual([]);
    expect(cards).toEqual([
      { expression: "break the ice", meaning: "어색함을 깨다", example: "", type: "idiom" },
      { expression: "serendipity", meaning: "뜻밖의 행운", example: "", type: "word" },
    ]);
  });

  it("하이픈·탭 구분자와 세 번째 칸(예문)을 받는다", () => {
    const { cards } = parseQuickInput(
      "hit the sack - 자러 가다 - I'm going to hit the sack.\r\nnevertheless\t그럼에도 불구하고"
    );
    expect(cards[0]).toMatchObject({
      expression: "hit the sack",
      meaning: "자러 가다",
      example: "I'm going to hit the sack.",
    });
    expect(cards[1]).toMatchObject({ expression: "nevertheless", meaning: "그럼에도 불구하고" });
  });

  it("글머리표를 떼고, 단어 안 하이픈은 구분자로 보지 않는다", () => {
    const { cards } = parseQuickInput("- well-known — 잘 알려진\n2) state-of-the-art — 최첨단의");
    expect(cards.map((c) => c.expression)).toEqual(["well-known", "state-of-the-art"]);
  });

  it("구분자가 없거나 한쪽이 비면 invalidLines", () => {
    const { cards, invalidLines } = parseQuickInput("just a line\n— 뜻만\n표현만 —");
    expect(cards).toEqual([]);
    expect(invalidLines).toEqual(["just a line", "— 뜻만", "표현만 —"]);
  });
});

describe("guessCardType", () => {
  it("단어/숙어/문장을 짐작한다", () => {
    expect(guessCardType("serendipity")).toBe("word");
    expect(guessCardType("break the ice")).toBe("idiom");
    expect(guessCardType("How have you been?")).toBe("sentence");
    expect(guessCardType("I would rather stay home tonight")).toBe("sentence");
  });
});
