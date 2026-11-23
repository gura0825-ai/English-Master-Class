/** 브라우저·서버 공용 Supabase 공개 설정. 값이 없으면 바로 알 수 있게 에러를 낸다. */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 없습니다. .env.example 을 .env.local 로 복사해 값을 채운 뒤 dev 서버를 다시 시작하세요."
    );
  }
  return { url, anonKey };
}
