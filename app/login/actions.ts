"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email?: string };

const emailSchema = z.email({ error: "이메일 주소를 정확히 입력해 주세요." });

/** 현재 요청의 사이트 주소 (localhost · vercel.app 어디서든 맞게) */
async function getSiteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "").trim();
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message, email: rawEmail };
  }
  const email = parsed.data.toLowerCase();
  const next = safeNextPath(String(formData.get("next") ?? ""));

  const callbackUrl = new URL("/auth/callback", await getSiteOrigin());
  // 항상 쿼리를 하나 붙여 둔다 (메일 템플릿에서 {{ .RedirectTo }}&token_hash=… 로 이어 붙이기 위해)
  callbackUrl.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) {
    console.error("[login] signInWithOtp 실패:", error.status, error.code, error.message);
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return {
        status: "error",
        message: "메일을 너무 자주 요청했어요. 잠시 후 다시 시도해 주세요.",
        email,
      };
    }
    if (error.code === "signup_disabled" || error.code === "otp_disabled") {
      return { status: "error", message: "등록되지 않은 이메일이에요.", email };
    }
    return {
      status: "error",
      message: "로그인 링크를 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
      email,
    };
  }

  return { status: "sent", email };
}
