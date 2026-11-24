/**
 * Supabase(PostgREST) 오류를 로그용 한 줄 문자열로 바꾼다.
 * PostgrestError 는 Error 를 상속해 message 가 console 에 '{}' 로만 찍히는 경우가 있다.
 */
export function describeDbError(error: unknown): string {
  if (!error) return "(no error)";
  if (typeof error !== "object") return String(error);
  const e = error as { code?: string; message?: string; details?: string; hint?: string; name?: string };
  return [
    e.code && `[${e.code}]`,
    e.message || e.name || "unknown error",
    e.details && `details: ${e.details}`,
    e.hint && `hint: ${e.hint}`,
  ]
    .filter(Boolean)
    .join(" ");
}
