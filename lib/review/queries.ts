import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { addDaysToDateString } from "@/lib/dates";
import type { CardType } from "@/lib/notes/constants";
import { describeDbError } from "@/lib/supabase/errors";

import { computeStreak } from "./streak";

export const DEFAULT_DAILY_LIMIT = 30;

export type DueCard = {
  id: string;
  note_id: string;
  expression: string;
  meaning: string;
  example: string | null;
  my_note: string | null;
  type: CardType;
  stage: number;
  review_count: number;
  next_review_date: string;
  note_title: string | null;
};

/**
 * 설정의 하루 최대 카드 수.
 * userId 는 service role(RLS 없음)로 부를 때 반드시 넘긴다.
 */
export async function getDailyLimit(supabase: SupabaseClient, userId?: string): Promise<number> {
  let query = supabase.from("profiles").select("daily_limit");
  if (userId) query = query.eq("id", userId);
  const { data, error } = await query.maybeSingle();
  if (error) console.error("[review] daily_limit:", describeDbError(error));
  return data?.daily_limit ?? DEFAULT_DAILY_LIMIT;
}

/**
 * 볼 카드: next_review_date <= dueBy(보통 오늘), 오래된 순, limit 장.
 * userId 는 service role(RLS 없음)로 부를 때 반드시 넘긴다.
 */
export async function getDueCards(
  supabase: SupabaseClient,
  dueBy: string,
  limit: number,
  userId?: string
): Promise<DueCard[]> {
  let query = supabase
    .from("cards")
    .select(
      "id, note_id, expression, meaning, example, my_note, type, stage, review_count, next_review_date, notes(title)"
    )
    .lte("next_review_date", dueBy);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query
    .order("next_review_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[review] due cards:", describeDbError(error));
    throw new Error("복습할 카드를 불러오지 못했어요.");
  }
  return (data ?? []).map((row) => {
    const note = row.notes as unknown as { title: string } | { title: string }[] | null;
    const noteTitle = Array.isArray(note) ? (note[0]?.title ?? null) : (note?.title ?? null);
    return {
      id: row.id,
      note_id: row.note_id,
      expression: row.expression,
      meaning: row.meaning,
      example: row.example,
      my_note: row.my_note,
      type: row.type,
      stage: row.stage,
      review_count: row.review_count,
      next_review_date: row.next_review_date,
      note_title: noteTitle,
    };
  });
}

/** 오늘까지 밀린 카드 전체 수 (daily_limit 과 무관) */
export async function countDueCards(supabase: SupabaseClient, today: string): Promise<number> {
  const { count, error } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .lte("next_review_date", today);
  if (error) console.error("[review] due count:", describeDbError(error));
  return count ?? 0;
}

/** 오늘 이후 가장 가까운 복습일과 그날 카드 수 */
export async function getNextReview(
  supabase: SupabaseClient,
  today: string
): Promise<{ date: string; count: number } | null> {
  const { data, error } = await supabase
    .from("cards")
    .select("next_review_date")
    .gt("next_review_date", today)
    .order("next_review_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[review] next review:", describeDbError(error));
  if (!data) return null;
  const { count } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("next_review_date", data.next_review_date);
  return { date: data.next_review_date, count: count ?? 0 };
}

/** 연속 학습일. study_days SQL 함수가 아직 없으면 null (화면에서 숨김) */
export async function getStudyStreak(supabase: SupabaseClient, today: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("study_days", {
    p_since: addDaysToDateString(today, -400),
  });
  if (error) {
    console.error("[home] study_days:", describeDbError(error));
    return null;
  }
  return computeStreak(
    ((data ?? []) as { day: string }[]).map((r) => r.day),
    today
  );
}
