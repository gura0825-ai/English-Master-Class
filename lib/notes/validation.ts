import { z } from "zod";

import { isDateString } from "@/lib/dates";

import { CARD_TYPES, LIMITS } from "./constants";

/** "영어, #drama , 영어" → ["영어", "drama"] (앞의 #·공백 제거, 대소문자 무시 중복 제거) */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of input.split(/[,\n]/)) {
    const tag = raw.trim().replace(/^#+/, "").trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}은(는) ${max.toLocaleString()}자 이하로 입력해 주세요.`)
    .transform((v) => (v === "" ? null : v));

export const noteFieldsSchema = z.object({
  study_date: z
    .string()
    .refine(isDateString, "날짜를 다시 선택해 주세요."),
  title: z
    .string()
    .trim()
    .min(1, "제목을 입력해 주세요.")
    .max(LIMITS.title, `제목은 ${LIMITS.title}자 이하로 입력해 주세요.`),
  source: optionalText(LIMITS.source, "출처"),
  memo: optionalText(LIMITS.memo, "메모"),
  tags: z
    .string()
    .transform(parseTags)
    .pipe(
      z
        .array(z.string().max(LIMITS.tag, `태그는 하나에 ${LIMITS.tag}자 이하로 입력해 주세요.`))
        .max(LIMITS.tags, `태그는 ${LIMITS.tags}개까지 넣을 수 있어요.`)
    ),
});

export const cardSchema = z.object({
  id: z.uuid().optional(),
  expression: z
    .string()
    .trim()
    .min(1, "표현을 입력해 주세요.")
    .max(LIMITS.expression, `표현은 ${LIMITS.expression}자 이하로 입력해 주세요.`),
  meaning: z
    .string()
    .trim()
    .min(1, "뜻을 입력해 주세요.")
    .max(LIMITS.meaning, `뜻은 ${LIMITS.meaning}자 이하로 입력해 주세요.`),
  example: optionalText(LIMITS.example, "예문"),
  my_note: optionalText(LIMITS.myNote, "내 메모"),
  type: z.enum(CARD_TYPES, "유형을 골라 주세요."),
});

export type ValidCard = z.output<typeof cardSchema>;
export type ValidNoteFields = z.output<typeof noteFieldsSchema>;

const rawCardSchema = z.object({
  id: z.string().optional(),
  expression: z.string().default(""),
  meaning: z.string().default(""),
  example: z.string().default(""),
  my_note: z.string().default(""),
  type: z.string().default("word"),
});

export type NoteValidationResult =
  | { ok: true; note: ValidNoteFields; cards: ValidCard[] }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

/**
 * 폼 값 검증. 완전히 빈 카드 줄은 버리고, 오류 키는 화면의 줄 번호(cards.{i}.필드)를 쓴다.
 */
export function validateNoteInput(input: {
  study_date: unknown;
  title: unknown;
  source: unknown;
  memo: unknown;
  tags: unknown;
  cardsJson: unknown;
}): NoteValidationResult {
  const fieldErrors: Record<string, string> = {};

  const noteResult = noteFieldsSchema.safeParse({
    study_date: String(input.study_date ?? ""),
    title: String(input.title ?? ""),
    source: String(input.source ?? ""),
    memo: String(input.memo ?? ""),
    tags: String(input.tags ?? ""),
  });
  if (!noteResult.success) {
    for (const issue of noteResult.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
  }

  let rawCards: z.output<typeof rawCardSchema>[] = [];
  try {
    const parsed = z.array(rawCardSchema).safeParse(JSON.parse(String(input.cardsJson ?? "[]")));
    if (parsed.success) rawCards = parsed.data;
    else fieldErrors.cards = "카드 정보를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.";
  } catch {
    fieldErrors.cards = "카드 정보를 읽지 못했어요. 새로고침 후 다시 시도해 주세요.";
  }

  const cards: ValidCard[] = [];
  rawCards.forEach((raw, index) => {
    const isEmpty = [raw.expression, raw.meaning, raw.example, raw.my_note].every((v) => !v.trim());
    if (isEmpty) return;
    const result = cardSchema.safeParse(raw);
    if (result.success) {
      cards.push(result.data);
    } else {
      for (const issue of result.error.issues) {
        const key = `cards.${index}.${String(issue.path[0] ?? "expression")}`;
        fieldErrors[key] ??= issue.message;
      }
    }
  });

  if (cards.length > LIMITS.cards) {
    fieldErrors.cards = `카드는 한 노트에 ${LIMITS.cards}개까지 넣을 수 있어요.`;
  }

  if (Object.keys(fieldErrors).length > 0 || !noteResult.success) {
    return { ok: false, message: "입력한 내용을 확인해 주세요.", fieldErrors };
  }
  return { ok: true, note: noteResult.data, cards };
}
