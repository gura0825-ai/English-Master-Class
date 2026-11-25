"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { PartyPopper } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { relativeDayKo } from "@/lib/dates";
import { CARD_TYPE_LABELS } from "@/lib/notes/constants";
import type { DueCard } from "@/lib/review/queries";
import type { ReviewResult } from "@/lib/review/record";
import { applyReview, MAX_STAGE, type Rating } from "@/lib/srs";
import { cn } from "@/lib/utils";

const RATING_BUTTONS: { rating: Rating; label: string; key: string; className: string }[] = [
  {
    rating: "again",
    label: "모름",
    key: "1",
    className: "border-destructive/40 text-destructive hover:bg-destructive/10",
  },
  { rating: "hard", label: "헷갈림", key: "2", className: "" },
  {
    rating: "good",
    label: "기억남",
    key: "3",
    className: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  },
];

type Tally = Record<Rating, number>;

type ReviewSessionProps = {
  cards: DueCard[];
  today: string;
  /** 평가 저장 Server Action (웹: submitReview, 메일: 토큰이 묶인 submitEmailReview) */
  submit: (cardId: string, rating: Rating) => Promise<ReviewResult>;
  doneHref?: string;
  doneLabel?: string;
};

export function ReviewSession({
  cards: initialCards,
  today,
  submit,
  doneHref = "/",
  doneLabel = "홈으로",
}: ReviewSessionProps) {
  // 처음 받은 목록을 고정해 둔다 (저장 후 서버 데이터가 바뀌어도 진행 순서가 흔들리지 않게)
  const [queue, setQueue] = useState(initialCards);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState<Tally>({ again: 0, hard: 0, good: 0 });
  const [failed, setFailed] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const retried = useRef(new Set<string>());

  const card = queue[index];
  const done = index >= queue.length;

  const rate = useCallback(
    (rating: Rating) => {
      if (!card || !revealed) return;
      const current = card;
      // 바로 다음 카드로 넘기고, 저장은 뒤에서 한다
      setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
      setIndex((i) => i + 1);
      setRevealed(false);
      startTransition(async () => {
        try {
          const result = await submit(current.id, rating);
          if (!result.ok) throw new Error(result.message);
        } catch {
          setTally((t) => ({ ...t, [rating]: t[rating] - 1 }));
          if (!retried.current.has(current.id)) {
            // 처음 실패한 카드는 맨 뒤에 한 번 더 넣는다
            retried.current.add(current.id);
            setQueue((q) => [...q, current]);
            setFailed(`'${current.expression}' 평가를 저장하지 못해 맨 뒤로 보냈어요.`);
          } else {
            // 두 번째도 실패하면 오늘은 건너뛴다 (다음에 다시 복습 대상으로 나온다)
            setFailed("저장하지 못한 카드가 있어요. 인터넷 연결을 확인하고 나중에 다시 복습해 주세요.");
          }
        }
      });
    },
    [card, revealed, submit]
  );

  // 키보드: Space/Enter 뒤집기, 1 모름 · 2 헷갈림 · 3 기억남
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
      if (done) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      const btn = RATING_BUTTONS.find((b) => b.key === e.key);
      if (revealed && btn) {
        e.preventDefault();
        rate(btn.rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, revealed, rate]);

  if (done) {
    const total = tally.again + tally.hard + tally.good;
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-10 text-center">
        <PartyPopper className="size-10 text-primary" aria-hidden />
        <h2 className="text-xl font-bold">오늘 복습 끝!</h2>
        <p className="text-muted-foreground">카드 {total}장을 복습했어요.</p>
        <dl className="grid w-full max-w-xs grid-cols-3 gap-2 text-sm">
          {RATING_BUTTONS.map((b) => (
            <div key={b.rating} className="rounded-lg bg-muted px-2 py-3">
              <dt className="text-muted-foreground">{b.label}</dt>
              <dd className="text-lg font-semibold">{tally[b.rating]}</dd>
            </div>
          ))}
        </dl>
        {failed && <p className="text-sm text-destructive">{failed}</p>}
        <Button asChild className="w-full max-w-xs">
          <Link href={doneHref}>{doneLabel}</Link>
        </Button>
      </div>
    );
  }

  const progress = Math.round((index / queue.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {index + 1} / {queue.length}
          </span>
          <span className="hidden sm:inline">Space 뒤집기 · 1 모름 · 2 헷갈림 · 3 기억남</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={index}
          aria-valuemin={0}
          aria-valuemax={queue.length}
          aria-label="복습 진행률"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {failed && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {failed}
        </p>
      )}

      <div
        role={revealed ? undefined : "button"}
        tabIndex={revealed ? undefined : 0}
        onClick={() => setRevealed(true)}
        aria-label={revealed ? undefined : `${card.expression} — 탭해서 뜻 보기`}
        className={cn(
          "flex min-h-72 flex-col gap-4 rounded-2xl border bg-card p-6 text-left shadow-sm transition-colors",
          !revealed && "cursor-pointer hover:border-primary/40"
        )}
      >
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{card.note_title}</span>
          <span className="flex shrink-0 gap-1">
            <Badge variant="secondary">{CARD_TYPE_LABELS[card.type]}</Badge>
            <Badge variant="accent">{card.stage >= MAX_STAGE ? "졸업" : `${card.stage}단계`}</Badge>
          </span>
        </div>

        <p lang="en" className="text-2xl font-bold break-words sm:text-3xl">
          {card.expression}
        </p>

        {revealed ? (
          <div className="flex flex-col gap-3 border-t pt-4">
            <p className="text-lg break-words">{card.meaning}</p>
            {card.example && (
              <p lang="en" className="italic text-muted-foreground break-words">
                {card.example}
              </p>
            )}
            {card.my_note && (
              <p className="rounded-md bg-muted px-3 py-2 text-sm break-words">{card.my_note}</p>
            )}
          </div>
        ) : (
          <p className="mt-auto text-center text-sm text-muted-foreground">탭해서 뜻 보기</p>
        )}
      </div>

      {revealed ? (
        <div className="grid grid-cols-3 gap-2">
          {RATING_BUTTONS.map((b) => {
            const next = applyReview(
              { stage: card.stage, review_count: card.review_count, lapse_count: 0 },
              b.rating,
              today
            ).next_review_date;
            return (
              <Button
                key={b.rating}
                type="button"
                variant="outline"
                onClick={() => rate(b.rating)}
                className={cn("h-16 flex-col gap-0.5", b.className)}
              >
                <span className="text-base font-semibold">{b.label}</span>
                <span className="text-xs font-normal opacity-80">{relativeDayKo(next, today)}</span>
              </Button>
            );
          })}
        </div>
      ) : (
        <Button type="button" size="lg" onClick={() => setRevealed(true)}>
          뜻 보기
        </Button>
      )}
    </div>
  );
}
