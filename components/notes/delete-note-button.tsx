"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteNote } from "@/app/(main)/notes/actions";
import { Button } from "@/components/ui/button";

export function DeleteNoteButton({ noteId, cardCount }: { noteId: string; cardCount: number }) {
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const message =
      cardCount > 0
        ? `이 노트와 카드 ${cardCount}개, 복습 기록을 모두 지울까요? 되돌릴 수 없어요.`
        : "이 노트를 지울까요? 되돌릴 수 없어요.";
    if (!window.confirm(message)) return;
    startTransition(() => deleteNote(noteId));
  };

  return (
    <Button type="button" variant="outline" onClick={onClick} disabled={pending} className="text-destructive">
      <Trash2 />
      {pending ? "지우는 중…" : "삭제"}
    </Button>
  );
}
