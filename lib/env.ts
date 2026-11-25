import "server-only";

/** 서버 전용 환경변수. 없으면 어떤 값을 .env.local 에 넣어야 하는지 알려준다 */
export function requireEnv(
  name:
    | "SUPABASE_SERVICE_ROLE_KEY"
    | "RESEND_API_KEY"
    | "EMAIL_FROM"
    | "CRON_SECRET"
    | "REVIEW_TOKEN_SECRET"
): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 환경변수가 없습니다. .env.local(배포 시 Vercel 환경변수)에 넣어 주세요.`);
  }
  return value;
}

/** 메일 속 링크에 쓸 앱 주소 (끝의 / 제거) */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_APP_URL 환경변수가 없습니다. 예: http://localhost:3000");
  }
  return url.replace(/\/+$/, "");
}
