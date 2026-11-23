import Link from "next/link";

import { PagePlaceholder } from "@/components/page-placeholder";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <PagePlaceholder
      title="홈"
      stage="4단계"
      description="오늘 볼 카드 수, 연속 학습일, 최근 노트 5개를 보여줘요."
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button asChild size="lg">
          <Link href="/notes/new">오늘 공부 기록</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/review">복습 시작</Link>
        </Button>
      </div>
    </PagePlaceholder>
  );
}
