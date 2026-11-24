import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateKo, todayInSeoul } from "@/lib/dates";
import { sanitizeSearchTerm } from "@/lib/notes/search";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type NoteListRow = {
  id: string;
  title: string;
  study_date: string;
  source: string | null;
  tags: string[];
  cards: { count: number }[];
};

function notesHref(params: { q?: string; tag?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.tag) sp.set("tag", params.tag);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/notes?${qs}` : "/notes";
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const rawQuery = (sp.q ?? "").trim();
  const term = sanitizeSearchTerm(rawQuery);
  const tag = (sp.tag ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const supabase = await createClient();

  // 태그 목록 (많이 쓴 순)
  const { data: tagRows } = await supabase.from("notes").select("tags").limit(1000);
  const tagCounts = new Map<string, number>();
  for (const row of tagRows ?? []) {
    for (const t of (row.tags as string[]) ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const allTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  let query = supabase
    .from("notes")
    .select("id, title, study_date, source, tags, cards(count)", { count: "exact" })
    .order("study_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (tag) query = query.contains("tags", [tag]);

  if (term) {
    // 카드(표현·뜻·예문)에 검색어가 있는 노트도 찾는다
    const pattern = `%${term}%`;
    const { data: cardHits } = await supabase
      .from("cards")
      .select("note_id")
      .or(`expression.ilike.${pattern},meaning.ilike.${pattern},example.ilike.${pattern}`)
      .limit(200); // id 목록이 URL 에 들어가므로 너무 길지 않게
    const noteIds = [...new Set((cardHits ?? []).map((c) => c.note_id as string))];
    const filters = [`title.ilike.${pattern}`, `source.ilike.${pattern}`, `memo.ilike.${pattern}`];
    if (noteIds.length > 0) filters.push(`id.in.(${noteIds.join(",")})`);
    query = query.or(filters.join(","));
  }

  const { data, count, error } = await query.returns<NoteListRow[]>();
  if (error) console.error("[notes] list:", error);
  const notes = data ?? [];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const today = todayInSeoul();
  const filtering = Boolean(term || tag);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">노트</h1>
        <Button asChild>
          <Link href="/notes/new">
            <Plus />새 노트
          </Link>
        </Button>
      </div>

      <form action="/notes" method="get" role="search" className="flex gap-2">
        {tag && <input type="hidden" name="tag" value={tag} />}
        <label htmlFor="notes-q" className="sr-only">
          검색어
        </label>
        <Input
          id="notes-q"
          name="q"
          type="search"
          defaultValue={rawQuery}
          placeholder="제목, 메모, 표현, 뜻으로 검색"
        />
        <Button type="submit" variant="outline" size="icon" aria-label="검색">
          <Search />
        </Button>
      </form>

      {allTags.length > 0 && (
        <nav aria-label="태그 필터" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link
            href={notesHref({ q: rawQuery })}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full border px-4 text-sm",
              !tag ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
            aria-current={!tag ? "page" : undefined}
          >
            전체
          </Link>
          {allTags.map(([t, n]) => (
            <Link
              key={t}
              href={notesHref({ q: rawQuery, tag: t })}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1 rounded-full border px-4 text-sm",
                tag === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
              aria-current={tag === t ? "page" : undefined}
            >
              #{t}
              <span className={tag === t ? "opacity-80" : "text-muted-foreground"}>{n}</span>
            </Link>
          ))}
        </nav>
      )}

      {filtering && (
        <p className="text-sm text-muted-foreground">
          {rawQuery && <>‘{rawQuery}’ </>}
          {tag && <>#{tag} </>}
          검색 결과 {total}개 ·{" "}
          <Link href="/notes" className="text-primary underline">
            초기화
          </Link>
        </p>
      )}

      {error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          노트를 불러오지 못했어요. 새로고침해 주세요.
        </p>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {filtering ? "찾는 노트가 없어요." : "아직 노트가 없어요. 오늘 공부한 표현을 기록해 보세요."}
          </p>
          {!filtering && (
            <Button asChild>
              <Link href="/notes/new">오늘 공부 기록</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => {
            const cardCount = note.cards?.[0]?.count ?? 0;
            return (
              <li key={note.id}>
                <Link
                  href={`/notes/${note.id}`}
                  className="flex min-h-12 flex-col gap-1 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold break-words">{note.title}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">카드 {cardCount}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDateKo(note.study_date, today)}
                    {note.source && <> · {note.source}</>}
                  </span>
                  {note.tags.length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {note.tags.map((t) => (
                        <Badge key={t} variant="accent">
                          #{t}
                        </Badge>
                      ))}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="페이지" className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {page > 1 ? (
            <Button asChild variant="outline">
              <Link href={notesHref({ q: rawQuery, tag, page: page - 1 })}>
                <ChevronLeft />
                이전
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline">
              <Link href={notesHref({ q: rawQuery, tag, page: page + 1 })}>
                다음
                <ChevronRight />
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
