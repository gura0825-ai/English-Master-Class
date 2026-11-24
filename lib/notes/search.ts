/**
 * 검색어를 PostgREST or() 필터에 안전하게 넣을 수 있게 다듬는다.
 * 쉼표·괄호·따옴표·역슬래시·와일드카드(% _ *)는 필터 문법을 깨므로 공백으로 바꾼다.
 */
export function sanitizeSearchTerm(input: string | undefined | null): string {
  return (input ?? "")
    .replace(/[,()"'\\%_*:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
