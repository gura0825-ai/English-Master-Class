import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateKo, relativeDayKo, todayInSeoul } from "@/lib/dates";
import { countDueCards, getDailyLimit, getNextReview, getStudyStreak } from "@/lib/review/queries";
import { describeDbError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type RecentNote = { id: string; title: string; study_date: string; source: string | null };

export default async function HomePage() {
  const supabase = await createClient();
  const today = todayInSeoul();

  const [limit, dueTotal, streak, recentResult] = await Promise.all([
    getDailyLimit(supabase),
    countDueCards(supabase, today),
    getStudyStreak(supabase, today),
    supabase
      .from("notes")
      .select("id, title, study_date, source")
      .order("study_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentNote[]>(),
  ]);
  if (recentResult.error) console.error("[home] recent notes:", describeDbError(recentResult.error));
  const recentNotes = recentResult.data ?? [];
  const todayCount = Math.min(dueTotal, limit);
  const next = todayCount === 0 ? await getNextReview(supabase, today) : null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">{formatDateKo(today, today)}</p>
          <h1 className="text-2xl font-bold">오늘의 학습</h1>
        </div>
        {streak !== null && (
          <p
            className="flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
            title="복습하거나 노트를 기록한 날이 이어진 일수"
          >
            <Flame className="size-4" aria-hidden />
            연속 {streak}일
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <div>
          <p className="text-sm text-muted-foreground">오늘 볼 카드</p>
          <p className="text-4xl font-bold">
            {todayCount}
            <span className="ml-1 text-lg font-medium text-muted-foreground">장</span>
          </p>
          {dueTotal > limit && (
            <p className="mt-1 text-sm text-muted-foreground">
              밀린 카드 {dueTotal}장 · 하루 {limit}장씩 보여줘요
            </p>
          )}
          {todayCount === 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {next
                ? `다음 복습: ${formatDateKo(next.date, today)} (${relativeDayKo(next.date, today)}) · ${next.count}장`
                : "카드를 추가하면 다음 날부터 복습이 시작돼요."}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {todayCount > 0 ? (
            <>
              <Button asChild size="lg">
                <Link href="/review">복습 시작</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/notes/new">오늘 공부 기록</Link>
              </Button>
            </>
          ) : (
            <Button asChild size="lg" className="sm:col-span-2">
              <Link href="/notes/new">오늘 공부 기록</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">최근 노트</h2>
          <Link
            href="/notes"
            className="flex h-12 items-center gap-0.5 px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            전체 보기
            <ChevronRight className="size-4" />
          </Link>
        </div>
        {recentNotes.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            아직 노트가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-xl border bg-card">
            {recentNotes.map((note) => (
              <li key={note.id}>
                <Link
                  href={`/notes/${note.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-accent/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{note.title}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {formatDateKo(note.study_date, today)}
                      {note.source && <> · {note.source}</>}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
