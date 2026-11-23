/**
 * 로그인 후 돌아갈 경로(next)를 같은 사이트 안의 경로로만 제한한다.
 * "//evil.com", "https://evil.com", "/\\evil.com" 같은 외부 이동을 막는다.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  // 로그인·인증 경로로 다시 보내지 않는다
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/auth/")) {
    return fallback;
  }
  return next;
}
