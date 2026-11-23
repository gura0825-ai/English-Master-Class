import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

/** 로그인 없이 열 수 있는 경로 */
const PUBLIC_PATHS = [
  "/login",
  "/auth/", // 매직링크 콜백, 로그아웃
  "/r/", // 메일 평가 페이지 (토큰으로 인증, 5단계)
  "/api/cron/", // Vercel Cron (CRON_SECRET 으로 인증, 5단계)
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p));
}

/**
 * 매 요청마다 Supabase 세션 쿠키를 갱신하고, 로그인하지 않았으면 /login 으로 보낸다.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        // 세션 쿠키가 담긴 응답이 캐시되지 않도록
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // createServerClient 와 getClaims 사이에 다른 코드를 넣지 않는다 (세션 갱신 누락 방지)
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirectWithCookies = (target: URL) => {
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") redirect.headers.set(key, value);
    });
    return redirect;
  };

  if (!isLoggedIn && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    return redirectWithCookies(loginUrl);
  }

  // 이미 로그인했는데 /login 에 오면 홈으로
  if (isLoggedIn && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return redirectWithCookies(homeUrl);
  }

  return response;
}
