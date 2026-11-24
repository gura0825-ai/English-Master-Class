import { createNote } from "@/app/(main)/notes/actions";
import { NoteForm } from "@/components/notes/note-form";
import { todayInSeoul } from "@/lib/dates";

export const dynamic = "force-dynamic"; // 날짜 기본값(오늘)을 요청마다 계산

export default function NewNotePage() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">노트 작성</h1>
      <NoteForm
        action={createNote}
        submitLabel="저장"
        cancelHref="/notes"
        initialValues={{
          study_date: todayInSeoul(),
          title: "",
          source: "",
          tags: "",
          memo: "",
          cards: [],
        }}
      />
    </section>
  );
}
