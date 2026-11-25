import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, LinkIcon } from "lucide-react";

import { ReviewSession } from "@/components/review/review-session";
import { Button } from "@/components/ui/button";
import { formatDateKo, todayInSeoul } from "@/lib/dates";
import { requireEnv } from "@/lib/env";
import { getDailyLimit, getDueCards } from "@/lib/review/queries";
import { verifyReviewToken } from "@/lib/review/token";
import { createAdminClient } from "@/lib/supabase/admin";

import { submitEmailReview } from "./actions";

export const metadata: Metadata = {
  title: "오늘의 복습 · English Master Class",
  robots: { index: false, follow: false },
  // 주소의 토큰이 글꼴 CDN 등 외부로 Referer 에 실려 나가지 않게
  referrer: "no-referrer",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <span className="text-lg font-bold tracking-tight text-primary">English Master Class</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

function Message({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Shell>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center">
        {icon}
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
        <Button asChild className="mt-2">
          <Link href="/review">로그인해서 복습하기</Link>
        </Button>
      </div>
    </Shell>
  );
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

/** 메일 속 링크로 여는 복습 페이지. GET 은 보여주기만 하고, 평가는 버튼(POST)으로만 저장한다 */
export default async function EmailReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const token = safeDecode((await params).token);
  const today = todayInSeoul();
  const check = verifyReviewToken(token, requireEnv("REVIEW_TOKEN_SECRET"), today);

  if (!check.ok) {
    return (
      <Message
        icon={<LinkIcon className="size-10 text-muted-foreground" aria-hidden />}
        title={check.reason === "expired" ? "링크가 만료되었어요" : "올바르지 않은 링크예요"}
        body="메일 링크는 보낸 날부터 3일 동안만 쓸 수 있어요. 앱에 로그인하면 오늘 카드를 복습할 수 있어요."
      />
    );
  }

  const admin = createAdminClient();
  const limit = await getDailyLimit(admin, check.userId);
  const cards = await getDueCards(admin, check.date, limit, check.userId);

  if (cards.length === 0) {
    return (
      <Message
        icon={<CalendarCheck className="size-10 text-primary" aria-hidden />}
        title="이 메일의 카드를 모두 복습했어요"
        body="앱에 로그인하면 노트와 다음 복습 일정을 볼 수 있어요."
      />
    );
  }

  return (
    <Shell>
      <section className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{formatDateKo(check.date, today)} 메일</p>
          <h1 className="text-2xl font-bold">오늘의 복습</h1>
        </div>
        <ReviewSession
          cards={cards}
          today={today}
          submit={submitEmailReview.bind(null, token)}
          doneHref="/"
          doneLabel="앱 열기"
        />
      </section>
    </Shell>
  );
}
