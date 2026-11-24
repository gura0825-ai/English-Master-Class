import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import { z } from "zod";

import { updateNote } from "@/app/(main)/notes/actions";
import { DeleteNoteButton } from "@/components/notes/delete-note-button";
import { Markdown } from "@/components/notes/markdown";
import { NoteForm } from "@/components/notes/note-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateKo, relativeDayKo, todayInSeoul } from "@/lib/dates";
import { CARD_TYPE_LABELS } from "@/lib/notes/constants";
import type { CardRow, NoteRow } from "@/lib/notes/types";
import { MAX_STAGE } from "@/lib/srs";
import { createClient } from "@/lib/supabase/server";

export default async function NoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: note }, { data: cardsData }] = await Promise.all([
    supabase.from("notes").select("*").eq("id", id).maybeSingle<NoteRow>(),
    supabase
      .from("cards")
      .select("*")
      .eq("note_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .returns<CardRow[]>(),
  ]);
  if (!note) notFound();
  const cards = cardsData ?? [];

  if (edit === "1") {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">노트 수정</h1>
        <NoteForm
          action={updateNote.bind(null, note.id)}
          submitLabel="저장"
          cancelHref={`/notes/${note.id}`}
          initialValues={{
            study_date: note.study_date,
            title: note.title,
            source: note.source ?? "",
            tags: note.tags.join(", "),
            memo: note.memo ?? "",
            cards: cards.map((c) => ({
              id: c.id,
              expression: c.expression,
              meaning: c.meaning,
              example: c.example ?? "",
              my_note: c.my_note ?? "",
              type: c.type,
              stage: c.stage,
            })),
          }}
        />
      </section>
    );
  }

  const today = todayInSeoul();

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/notes"
          className="-ml-2 flex h-12 w-fit items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          노트 목록
        </Link>
        <p className="text-sm text-muted-foreground">
          {formatDateKo(note.study_date, today)}
          {note.source && <> · {note.source}</>}
        </p>
        <h1 className="text-2xl font-bold break-words">{note.title}</h1>
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <Link key={tag} href={`/notes?tag=${encodeURIComponent(tag)}`}>
                <Badge variant="accent">#{tag}</Badge>
              </Link>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button asChild variant="outline">
            <Link href={`/notes/${note.id}?edit=1`}>
              <Pencil />
              수정
            </Link>
          </Button>
          <DeleteNoteButton noteId={note.id} cardCount={cards.length} />
        </div>
      </div>

      {note.memo && (
        <section className="rounded-xl border bg-card p-4">
          <Markdown>{note.memo}</Markdown>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          카드 <span className="text-muted-foreground">{cards.length}</span>
        </h2>
        {cards.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            아직 카드가 없어요. [수정]에서 표현을 추가해 보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cards.map((card) => (
              <li key={card.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p lang="en" className="text-lg font-semibold break-words">
                    {card.expression}
                  </p>
                  <Badge variant="secondary">{CARD_TYPE_LABELS[card.type]}</Badge>
                </div>
                <p className="break-words">{card.meaning}</p>
                {card.example && (
                  <p lang="en" className="text-sm italic text-muted-foreground break-words">
                    {card.example}
                  </p>
                )}
                {card.my_note && (
                  <p className="rounded-md bg-muted px-3 py-2 text-sm break-words">{card.my_note}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {card.stage >= MAX_STAGE ? "졸업" : `${card.stage}단계`} · 다음 복습{" "}
                  {formatDateKo(card.next_review_date, today)} ({relativeDayKo(card.next_review_date, today)})
                  {card.review_count > 0 && <> · 복습 {card.review_count}회</>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
