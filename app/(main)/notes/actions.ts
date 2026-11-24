"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { todayInSeoul } from "@/lib/dates";
import { validateNoteInput, type ValidCard } from "@/lib/notes/validation";
import { newCardSchedule } from "@/lib/srs";
import { createClient } from "@/lib/supabase/server";

export type NoteFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors: Record<string, string> };

const SAVE_FAILED = "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";

function readForm(formData: FormData) {
  return validateNoteInput({
    study_date: formData.get("study_date"),
    title: formData.get("title"),
    source: formData.get("source"),
    memo: formData.get("memo"),
    tags: formData.get("tags"),
    cardsJson: formData.get("cards"),
  });
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** 새 카드 행. created_at 을 1ms 씩 늘려 입력한 순서대로 보이게 한다 */
function newCardRows(cards: ValidCard[], noteId: string, userId: string) {
  const schedule = newCardSchedule(todayInSeoul());
  const base = Date.now();
  return cards.map((card, i) => ({
    note_id: noteId,
    user_id: userId,
    expression: card.expression,
    meaning: card.meaning,
    example: card.example,
    my_note: card.my_note,
    type: card.type,
    stage: schedule.stage,
    next_review_date: schedule.next_review_date,
    created_at: new Date(base + i).toISOString(),
  }));
}

export async function createNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const input = readForm(formData);
  if (!input.ok) return { status: "error", message: input.message, fieldErrors: input.fieldErrors };

  const { supabase, user } = await requireUser();

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .insert({ ...input.note, user_id: user.id })
    .select("id")
    .single();
  if (noteError || !note) {
    console.error("[createNote] note insert:", noteError);
    return { status: "error", message: SAVE_FAILED, fieldErrors: {} };
  }

  if (input.cards.length > 0) {
    const { error: cardsError } = await supabase
      .from("cards")
      .insert(newCardRows(input.cards, note.id, user.id));
    if (cardsError) {
      console.error("[createNote] cards insert:", cardsError);
      // 카드 저장이 실패하면 반쪽 노트가 남지 않게 지운다
      await supabase.from("notes").delete().eq("id", note.id);
      return { status: "error", message: SAVE_FAILED, fieldErrors: {} };
    }
  }

  revalidatePath("/notes");
  revalidatePath("/");
  redirect(`/notes/${note.id}`);
}

export async function updateNote(
  noteId: string,
  _prev: NoteFormState,
  formData: FormData
): Promise<NoteFormState> {
  if (!z.uuid().safeParse(noteId).success) {
    return { status: "error", message: "노트를 찾을 수 없어요.", fieldErrors: {} };
  }
  const input = readForm(formData);
  if (!input.ok) return { status: "error", message: input.message, fieldErrors: input.fieldErrors };

  const { supabase, user } = await requireUser();

  // RLS 때문에 남의 노트는 0행 → 찾을 수 없음
  const { data: updated, error: noteError } = await supabase
    .from("notes")
    .update(input.note)
    .eq("id", noteId)
    .select("id");
  if (noteError) {
    console.error("[updateNote] note update:", noteError);
    return { status: "error", message: SAVE_FAILED, fieldErrors: {} };
  }
  if (!updated?.length) {
    return { status: "error", message: "노트를 찾을 수 없어요.", fieldErrors: {} };
  }

  const { data: existing, error: existingError } = await supabase
    .from("cards")
    .select("id")
    .eq("note_id", noteId);
  if (existingError) {
    console.error("[updateNote] cards select:", existingError);
    return { status: "error", message: SAVE_FAILED, fieldErrors: {} };
  }

  const existingIds = new Set((existing ?? []).map((c) => c.id as string));
  const keptCards = input.cards.filter((c) => c.id && existingIds.has(c.id));
  const newCards = input.cards.filter((c) => !c.id || !existingIds.has(c.id));
  const keptIds = new Set(keptCards.map((c) => c.id));
  const removedIds = [...existingIds].filter((id) => !keptIds.has(id));

  // 화면에서 지운 카드 삭제 (복습 이력도 cascade 로 삭제)
  if (removedIds.length > 0) {
    const { error } = await supabase.from("cards").delete().eq("note_id", noteId).in("id", removedIds);
    if (error) {
      console.error("[updateNote] cards delete:", error);
      return { status: "error", message: SAVE_FAILED, fieldErrors: {} };
    }
  }

  // 남은 카드는 내용만 고친다 (stage·다음 복습일은 그대로)
  const updateResults = await Promise.all(
    keptCards.map((card) =>
      supabase
        .from("cards")
        .update({
          expression: card.expression,
          meaning: card.meaning,
          example: card.example,
          my_note: card.my_note,
          type: card.type,
        })
        .eq("id", card.id!)
        .eq("note_id", noteId)
    )
  );
  const updateError = updateResults.find((r) => r.error)?.error;
  if (updateError) {
    console.error("[updateNote] cards update:", updateError);
    return { status: "error", message: SAVE_FAILED, fieldErrors: {} };
  }

  if (newCards.length > 0) {
    const { error } = await supabase.from("cards").insert(newCardRows(newCards, noteId, user.id));
    if (error) {
      console.error("[updateNote] cards insert:", error);
      return { status: "error", message: SAVE_FAILED, fieldErrors: {} };
    }
  }

  revalidatePath("/notes");
  revalidatePath(`/notes/${noteId}`);
  revalidatePath("/");
  redirect(`/notes/${noteId}`);
}

export async function deleteNote(noteId: string): Promise<void> {
  if (!z.uuid().safeParse(noteId).success) redirect("/notes");
  const { supabase } = await requireUser();

  // 카드·복습 이력은 on delete cascade 로 함께 삭제
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) {
    console.error("[deleteNote]", error);
    throw new Error("노트를 삭제하지 못했어요.");
  }

  revalidatePath("/notes");
  revalidatePath("/");
  redirect("/notes");
}
