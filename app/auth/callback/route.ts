import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * 매직링크를 누르면 오는 곳. 두 가지 방식을 모두 받는다.
 * 1) token_hash + type : 메일 템플릿을 바꾼 경우 (다른 브라우저·기기에서 열어도 동작, 권장)
 * 2) code              : Supabase 기본 템플릿 (PKCE, 링크를 요청한 브라우저에서만 동작)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let errorMessage: string | null = null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    errorMessage = error?.message ?? null;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    errorMessage = error?.message ?? null;
  } else {
    errorMessage = searchParams.get("error_description") ?? "missing_token";
  }

  if (errorMessage) {
    console.error("[auth/callback] 로그인 실패:", errorMessage);
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
