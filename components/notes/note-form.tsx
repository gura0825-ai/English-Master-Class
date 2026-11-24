"use client";

import Link from "next/link";
import { startTransition, useActionState, useId, useMemo, useState, type FormEvent } from "react";
import { ClipboardPaste, Plus, Trash2 } from "lucide-react";

import type { NoteFormState } from "@/app/(main)/notes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CARD_TYPE_LABELS, CARD_TYPES, LIMITS, type CardType } from "@/lib/notes/constants";
import { parseQuickInput } from "@/lib/notes/quick-parse";
import type { CardDraft } from "@/lib/notes/types";
import { cn } from "@/lib/utils";

export type NoteFormValues = {
  study_date: string;
  title: string;
  source: string;
  tags: string;
  memo: string;
  cards: (CardDraft & { stage?: number })[];
};

type DraftRow = CardDraft & { key: string; stage?: number };

type NoteFormProps = {
  action: (state: NoteFormState, formData: FormData) => Promise<NoteFormState>;
  initialValues: NoteFormValues;
  submitLabel: string;
  cancelHref: string;
};

let keySeq = 0;
const nextKey = () => `row-${++keySeq}`;

const emptyRow = (): DraftRow => ({
  key: nextKey(),
  expression: "",
  meaning: "",
  example: "",
  my_note: "",
  type: "word",
});

const selectClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

export function NoteForm({ action, initialValues, submitLabel, cancelHref }: NoteFormProps) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as NoteFormState);
  const formId = useId();

  const [studyDate, setStudyDate] = useState(initialValues.study_date);
  const [title, setTitle] = useState(initialValues.title);
  const [source, setSource] = useState(initialValues.source);
  const [tags, setTags] = useState(initialValues.tags);
  const [memo, setMemo] = useState(initialValues.memo);
  const [rows, setRows] = useState<DraftRow[]>(() =>
    // 첫 렌더의 key 는 서버·브라우저가 같아야 하므로 고정값을 쓴다
    initialValues.cards.length > 0
      ? initialValues.cards.map((c, i) => ({ ...c, key: `init-${i}` }))
      : [{ ...emptyRow(), key: "init-0" }]
  );

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const parsed = useMemo(() => parseQuickInput(pasteText), [pasteText]);

  const errors = state.status === "error" ? state.fieldErrors : {};
  const err = (key: string) => errors[key];

  const updateRow = (key: string, patch: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeRow = (row: DraftRow) => {
    if (row.id && !window.confirm(`'${row.expression || "이 카드"}'를 지울까요? 저장하면 복습 기록도 함께 지워져요.`)) {
      return;
    }
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== row.key);
      return next.length > 0 ? next : [emptyRow()];
    });
  };

  const addPastedCards = () => {
    if (parsed.cards.length === 0) return;
    setRows((prev) => {
      // 비어 있는 줄은 붙여넣은 카드로 대신한다
      const filled = prev.filter((r) => r.id || r.expression.trim() || r.meaning.trim());
      const added = parsed.cards.map((c) => ({ ...c, my_note: "", key: nextKey() }));
      return [...filled, ...added];
    });
    setPasteText("");
    setPasteOpen(false);
  };

  const cardsJson = JSON.stringify(
    rows.map(({ id, expression, meaning, example, my_note, type }) => ({
      id,
      expression,
      meaning,
      example,
      my_note,
      type,
    }))
  );

  // form 의 action 속성을 쓰면 React 가 제출 후 폼을 초기화해 <select>(유형)가 첫 값으로 돌아간다.
  // 검증 오류로 돌아와도 입력값이 그대로 남도록 직접 제출한다.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };

  const filledCount = rows.filter((r) => r.expression.trim() || r.meaning.trim()).length;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="cards" value={cardsJson} />

      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      {/* 노트 정보 */}
      <section className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-date`}>날짜</Label>
            <Input
              id={`${formId}-date`}
              name="study_date"
              type="date"
              value={studyDate}
              onChange={(e) => setStudyDate(e.target.value)}
              aria-invalid={!!err("study_date") || undefined}
            />
            <FieldError id={`${formId}-date-error`} message={err("study_date")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-title`}>제목</Label>
            <Input
              id={`${formId}-title`}
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 프렌즈 시즌1 1화"
              maxLength={LIMITS.title}
              aria-invalid={!!err("title") || undefined}
              aria-describedby={err("title") ? `${formId}-title-error` : undefined}
            />
            <FieldError id={`${formId}-title-error`} message={err("title")} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-source`}>출처</Label>
            <Input
              id={`${formId}-source`}
              name="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="강의명·책·드라마"
              maxLength={LIMITS.source}
              aria-invalid={!!err("source") || undefined}
            />
            <FieldError id={`${formId}-source-error`} message={err("source")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${formId}-tags`}>태그</Label>
            <Input
              id={`${formId}-tags`}
              name="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="쉼표로 구분 (예: 미드, 회화)"
              aria-invalid={!!err("tags") || undefined}
            />
            <FieldError id={`${formId}-tags-error`} message={err("tags")} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-memo`}>
            메모 <span className="font-normal text-muted-foreground">(마크다운 가능)</span>
          </Label>
          <Textarea
            id={`${formId}-memo`}
            name="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="오늘 배운 내용, 느낀 점 등"
            rows={4}
            aria-invalid={!!err("memo") || undefined}
          />
          <FieldError id={`${formId}-memo-error`} message={err("memo")} />
        </div>
      </section>

      {/* 카드 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            카드 <span className="text-muted-foreground">{filledCount}</span>
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPasteOpen((v) => !v)}
            aria-expanded={pasteOpen}
          >
            <ClipboardPaste />
            한꺼번에 붙여넣기
          </Button>
        </div>
        <FieldError id={`${formId}-cards-error`} message={err("cards")} />

        {pasteOpen && (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-accent/40 p-4">
            <Label htmlFor={`${formId}-paste`}>
              한 줄에 하나씩 <code className="rounded bg-background px-1">표현 — 뜻</code> 형식으로 붙여넣으세요
            </Label>
            <Textarea
              id={`${formId}-paste`}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={6}
              placeholder={"break the ice — 어색함을 깨다\nserendipity - 뜻밖의 행운\nhit the sack — 자러 가다 — I'm going to hit the sack."}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              구분자는 —, –, 앞뒤 띄운 -, 탭 모두 돼요. 세 번째 칸은 예문으로 들어가요.
            </p>
            {pasteText.trim() && (
              <div className="text-sm">
                <p>
                  카드 <strong>{parsed.cards.length}</strong>개로 나눴어요
                  {parsed.invalidLines.length > 0 && (
                    <span className="text-destructive"> · 알아보지 못한 줄 {parsed.invalidLines.length}개</span>
                  )}
                </p>
                {parsed.invalidLines.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-destructive">
                    {parsed.invalidLines.slice(0, 5).map((line, i) => (
                      <li key={i} className="break-all">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setPasteOpen(false)}>
                닫기
              </Button>
              <Button type="button" onClick={addPastedCards} disabled={parsed.cards.length === 0}>
                카드 {parsed.cards.length}개 추가
              </Button>
            </div>
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const p = `${formId}-card-${row.key}`;
            const e = (field: string) => err(`cards.${index}.${field}`);
            return (
              <li
                key={row.key}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border bg-card p-4",
                  (e("expression") || e("meaning") || e("type") || e("example") || e("my_note")) &&
                    "border-destructive/60"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}
                    {row.id && typeof row.stage === "number" && (
                      <Badge variant="accent" className="ml-2">
                        {row.stage}단계
                      </Badge>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(row)}
                    aria-label={`${index + 1}번 카드 지우기`}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px]">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${p}-expression`}>영어 표현</Label>
                    <Input
                      id={`${p}-expression`}
                      value={row.expression}
                      onChange={(ev) => updateRow(row.key, { expression: ev.target.value })}
                      placeholder="break the ice"
                      lang="en"
                      autoCapitalize="none"
                      maxLength={LIMITS.expression}
                      aria-invalid={!!e("expression") || undefined}
                    />
                    <FieldError id={`${p}-expression-error`} message={e("expression")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${p}-meaning`}>뜻</Label>
                    <Input
                      id={`${p}-meaning`}
                      value={row.meaning}
                      onChange={(ev) => updateRow(row.key, { meaning: ev.target.value })}
                      placeholder="어색함을 깨다"
                      maxLength={LIMITS.meaning}
                      aria-invalid={!!e("meaning") || undefined}
                    />
                    <FieldError id={`${p}-meaning-error`} message={e("meaning")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${p}-type`}>유형</Label>
                    <select
                      id={`${p}-type`}
                      value={row.type}
                      onChange={(ev) => updateRow(row.key, { type: ev.target.value as CardType })}
                      className={selectClass}
                    >
                      {CARD_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {CARD_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <FieldError id={`${p}-type-error`} message={e("type")} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${p}-example`}>
                      예문 <span className="font-normal text-muted-foreground">(선택)</span>
                    </Label>
                    <Input
                      id={`${p}-example`}
                      value={row.example}
                      onChange={(ev) => updateRow(row.key, { example: ev.target.value })}
                      placeholder="Let's play a game to break the ice."
                      lang="en"
                      maxLength={LIMITS.example}
                      aria-invalid={!!e("example") || undefined}
                    />
                    <FieldError id={`${p}-example-error`} message={e("example")} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${p}-my-note`}>
                      내 메모 <span className="font-normal text-muted-foreground">(선택)</span>
                    </Label>
                    <Input
                      id={`${p}-my-note`}
                      value={row.my_note}
                      onChange={(ev) => updateRow(row.key, { my_note: ev.target.value })}
                      placeholder="헷갈리는 점, 비슷한 표현"
                      maxLength={LIMITS.myNote}
                      aria-invalid={!!e("my_note") || undefined}
                    />
                    <FieldError id={`${p}-my-note-error`} message={e("my_note")} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <Button type="button" variant="outline" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
          <Plus />
          카드 추가
        </Button>
      </section>

      <div className="sticky bottom-0 -mx-4 grid grid-cols-[1fr_2fr] gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <Button asChild variant="outline">
          <Link href={cancelHref}>취소</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "저장하는 중…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
