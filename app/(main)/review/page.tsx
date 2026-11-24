import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { ReviewSession } from "@/components/review/review-session";
import { Button } from "@/components/ui/button";
import { formatDateKo, relativeDayKo, todayInSeoul } from "@/lib/dates";
import { countDueCards, getDailyLimit, getDueCards, getNextReview } from "@/lib/review/queries";
import { createClient } from "@/lib/supabase/server";

export default async function ReviewPage() {
  const supabase = await createClient();
  const today = todayInSeoul();
  const limit = await getDailyLimit(supabase);
  const [cards, dueTotal] = await Promise.all([
    getDueCards(supabase, today, limit),
    countDueCards(supabase, today),
  ]);

  if (cards.length === 0) {
    const next = await getNextReview(supabase, today);
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">오늘의 복습</h1>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center">
          <CalendarCheck className="size-10 text-primary" aria-hidden />
          <p className="text-lg font-semibold">오늘 복습할 카드가 없어요</p>
          <p className="text-sm text-muted-foreground">
            {next
              ? `다음 복습: ${formatDateKo(next.date, today)} (${relativeDayKo(next.date, today)}) · ${next.count}장`
              : "노트에 카드를 추가하면 다음 날부터 복습이 시작돼요."}
          </p>
          <Button asChild className="mt-2">
            <Link href="/notes/new">오늘 공부 기록</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold">오늘의 복습</h1>
        {dueTotal > cards.length && (
          <p className="text-sm text-muted-foreground">
            밀린 카드 {dueTotal}장 중 {cards.length}장
          </p>
        )}
      </div>
      <ReviewSession cards={cards} today={today} />
    </section>
  );
}
