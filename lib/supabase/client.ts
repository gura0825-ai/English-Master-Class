import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/** Client Component 용 클라이언트 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
