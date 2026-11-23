import Link from "next/link";

import { PagePlaceholder } from "@/components/page-placeholder";
import { Button } from "@/components/ui/button";

export default function NotesPage() {
  return (
    <PagePlaceholder
      title="노트 목록"
      stage="3단계"
      description="날짜순 노트 목록, 검색창, 태그 필터가 들어가요."
    >
      <Button asChild>
        <Link href="/notes/new">새 노트 작성</Link>
      </Button>
    </PagePlaceholder>
  );
}
