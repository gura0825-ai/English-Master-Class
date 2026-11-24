import { describe, expect, it } from "vitest";

import { parseTags, validateNoteInput } from "./validation";

const base = {
  study_date: "2026-11-24",
  title: "  드라마 Friends S1E1  ",
  source: "",
  memo: "",
  tags: "drama, #Friends, friends",
  cardsJson: "[]",
};

describe("parseTags", () => {
  it("쉼표·줄바꿈으로 나누고 # 과 중복(대소문자 무시)을 없앤다", () => {
    expect(parseTags("영어, #drama ,\nDrama,  ,##미드")).toEqual(["영어", "drama", "미드"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("validateNoteInput", () => {
  it("노트 필드를 다듬고 빈 칸은 null 로", () => {
    const result = validateNoteInput(base);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.note).toEqual({
      study_date: "2026-11-24",
      title: "드라마 Friends S1E1",
      source: null,
      memo: null,
      tags: ["drama", "Friends"],
    });
    expect(result.cards).toEqual([]);
  });

  it("제목·날짜 오류", () => {
    const result = validateNoteInput({ ...base, title: "   ", study_date: "2026-02-30" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.title).toBe("제목을 입력해 주세요.");
    expect(result.fieldErrors.study_date).toBeDefined();
  });

  it("완전히 빈 카드 줄은 버리고, 일부만 채운 줄은 화면 줄 번호로 오류", () => {
    const cards = [
      { expression: "", meaning: "", example: "", my_note: "", type: "word" },
      { expression: "break the ice", meaning: "", example: "", my_note: "", type: "idiom" },
      { expression: " serendipity ", meaning: "뜻밖의 행운", example: "", my_note: "", type: "word" },
    ];
    const result = validateNoteInput({ ...base, cardsJson: JSON.stringify(cards) });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors).toEqual({ "cards.1.meaning": "뜻을 입력해 주세요." });
  });

  it("올바른 카드는 다듬어서 돌려준다", () => {
    const cards = [
      { expression: " serendipity ", meaning: "뜻밖의 행운", example: " ", my_note: "", type: "word" },
      { expression: "", meaning: "", example: "", my_note: "", type: "word" },
    ];
    const result = validateNoteInput({ ...base, cardsJson: JSON.stringify(cards) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.cards).toEqual([
      { expression: "serendipity", meaning: "뜻밖의 행운", example: null, my_note: null, type: "word" },
    ]);
  });

  it("잘못된 유형·id·JSON 을 거부한다", () => {
    const bad = [{ id: "not-a-uuid", expression: "a", meaning: "b", type: "phrase" }];
    const r1 = validateNoteInput({ ...base, cardsJson: JSON.stringify(bad) });
    expect(r1.ok).toBe(false);
    if (!r1.ok) {
      expect(r1.fieldErrors["cards.0.id"]).toBeDefined();
      expect(r1.fieldErrors["cards.0.type"]).toBe("유형을 골라 주세요.");
    }
    const r2 = validateNoteInput({ ...base, cardsJson: "{oops" });
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.fieldErrors.cards).toBeDefined();
  });
});
