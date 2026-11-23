import { PagePlaceholder } from "@/components/page-placeholder";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PagePlaceholder
      title="노트 상세·수정"
      stage="3단계"
      description={`노트 내용, 카드별 현재 단계와 다음 복습일, 수정/삭제가 들어가요. (노트 ID: ${id})`}
    />
  );
}
