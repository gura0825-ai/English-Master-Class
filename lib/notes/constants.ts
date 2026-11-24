export const CARD_TYPES = ["word", "idiom", "sentence", "grammar"] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  word: "단어",
  idiom: "숙어",
  sentence: "문장",
  grammar: "문법",
};

// DB 체크 제약과 같은 값 (supabase/migrations/20261123000000_init.sql)
export const LIMITS = {
  title: 200,
  source: 200,
  memo: 20000,
  expression: 500,
  meaning: 500,
  example: 1000,
  myNote: 2000,
  tag: 30,
  tags: 20,
  cards: 200,
} as const;
