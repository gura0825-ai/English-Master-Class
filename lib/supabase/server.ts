import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";

/**
 * Server Component · Server Action · Route Handler 용 클라이언트 (요청마다 새로 만든다).
 * 로그인한 사용자 권한(anon key + 세션)으로 동작하므로 RLS 가 그대로 적용된다.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component 에서는 쿠키를 쓸 수 없다. 세션 갱신은 middleware 가 맡는다.
        }
      },
    },
  });
}
