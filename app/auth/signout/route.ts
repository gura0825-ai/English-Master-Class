import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** 로그아웃 (POST 만 허용: 링크 미리 열기로 로그아웃되지 않게) */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
}
