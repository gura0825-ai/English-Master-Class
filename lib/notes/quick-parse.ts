import type { CardType } from "./constants";

export type ParsedCard = {
  expression: string;
  meaning: string;
  example: string;
  type: CardType;
};

export type QuickParseResult = {
  cards: ParsedCard[];
  /** 형식을 알아보지 못한 줄 (원문 그대로) */
  invalidLines: string[];
};

// 구분자: 긴 줄표(—), 짧은 줄표(–), 앞뒤 공백 있는 하이픈(" - ", " -- "), 탭
const SEPARATOR = /\s*[—–]\s*|\s+-{1,2}\s+|\t+/;
// 줄 앞 글머리표: "- ", "* ", "• ", "1. ", "2) "
const BULLET = /^\s*(?:[-*•·]|\d+[.)])\s+/;

/** 표현만 보고 유형을 짐작한다 (문법은 직접 고르게 둔다) */
export function guessCardType(expression: string): CardType {
  const words = expression.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return "word";
  if (/[.?!]$/.test(expression.trim()) || words.length >= 6) return "sentence";
  return "idiom";
}

/**
 * 여러 줄을 붙여넣으면 '표현 — 뜻 — 예문(선택)' 형식으로 카드를 나눈다.
 * 빈 줄은 건너뛰고, 구분자가 없거나 표현/뜻이 비면 invalidLines 로 돌려준다.
 */
export function parseQuickInput(text: string): QuickParseResult {
  const cards: ParsedCard[] = [];
  const invalidLines: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const line = rawLine.replace(BULLET, "").trim();
    const parts = line.split(SEPARATOR).map((p) => p.trim());

    if (parts.length < 2 || !parts[0] || !parts[1]) {
      invalidLines.push(rawLine.trim());
      continue;
    }

    const [expression, meaning, ...rest] = parts;
    cards.push({
      expression,
      meaning,
      example: rest.filter(Boolean).join(" — "),
      type: guessCardType(expression),
    });
  }

  return { cards, invalidLines };
}
