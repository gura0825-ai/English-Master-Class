import type { CardType } from "./constants";

export type NoteRow = {
  id: string;
  user_id: string;
  study_date: string;
  title: string;
  source: string | null;
  memo: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type CardRow = {
  id: string;
  note_id: string;
  user_id: string;
  expression: string;
  meaning: string;
  example: string | null;
  my_note: string | null;
  type: CardType;
  stage: number;
  next_review_date: string;
  last_reviewed_at: string | null;
  review_count: number;
  lapse_count: number;
  created_at: string;
  updated_at: string;
};

/** 폼에서 주고받는 카드 (id 가 있으면 기존 카드) */
export type CardDraft = {
  id?: string;
  expression: string;
  meaning: string;
  example: string;
  my_note: string;
  type: CardType;
};
