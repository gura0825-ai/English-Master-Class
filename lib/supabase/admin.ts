import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireEnv } from "@/lib/env";

import { getSupabaseEnv } from "./env";

/**
 * service role 클라이언트 — RLS 를 우회한다.
 * 로그인 없이 동작해야 하는 서버 코드(매일 메일 cron, 메일 평가 페이지 /r/[token])에서만 쓰고,
 * 반드시 user_id 조건을 직접 걸어야 한다. 브라우저 코드에서 import 하면 빌드가 실패한다(server-only).
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  return createClient(url, requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
