"use server";

import { revalidatePath } from "next/cache";

import { todayInSeoul } from "@/lib/dates";
import type { EmailSourceCard } from "@/lib/email/daily-review";
import { sendDailyReviewEmail } from "@/lib/email/send";
import { DEFAULT_DAILY_LIMIT } from "@/lib/review/queries";
import { settingsSchema } from "@/lib/settings/validation";
import { describeDbError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type ActionMessage =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function updateSettings(_prev: ActionMessage, formData: FormData): Promise<ActionMessage> {
  const parsed = settingsSchema.safeParse({
    email_enabled: formData.get("email_enabled"),
    daily_limit: formData.get("daily_limit"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", message: "입력한 값을 확인해 주세요.", fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "로그인이 필요해요. 새로고침해 주세요." };

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .select("id");
  if (error || !data?.length) {
    console.error("[settings] update:", describeDbError(error));
    return { status: "error", message: "저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  revalidatePath("/settings");
  revalidatePath("/");
  return { status: "success", message: "저장했어요." };
}

/**
 * 지금 내 메일로 오늘의 복습 메일을 한 통 보낸다 (발송 기록에는 남기지 않음).
 * 로그인 사용자 권한(RLS)으로 카드를 읽으므로 service role 을 쓰지 않는다.
 */
export async function sendTestEmail(): Promise<ActionMessage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "로그인이 필요해요. 새로고침해 주세요." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, daily_limit")
    .eq("id", user.id)
    .maybeSingle();
  const to = profile?.email || user.email;
  if (!to) return { status: "error", message: "받을 이메일 주소가 없어요." };

  const today = todayInSeoul();
  const limit = profile?.daily_limit ?? DEFAULT_DAILY_LIMIT;
  const [cardsRes, countRes] = await Promise.all([
    supabase
      .from("cards")
      .select("expression, meaning, example, review_count, last_reviewed_at, created_at")
      .lte("next_review_date", today)
      .order("next_review_date", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit)
      .returns<EmailSourceCard[]>(),
    supabase.from("cards").select("id", { count: "exact", head: true }).lte("next_review_date", today),
  ]);
  if (cardsRes.error) {
    console.error("[settings] test email cards:", describeDbError(cardsRes.error));
    return { status: "error", message: "카드를 불러오지 못했어요." };
  }
  const cards = cardsRes.data ?? [];
  if (cards.length === 0) {
    return {
      status: "error",
      message: "오늘 복습할 카드가 없어 보낼 내용이 없어요. 복습할 카드가 있는 날 다시 시도해 주세요.",
    };
  }

  try {
    const result = await sendDailyReviewEmail({
      userId: user.id,
      to,
      today,
      cards,
      totalDue: countRes.count ?? cards.length,
    });
    if (!result.ok) {
      console.error("[settings] test email send:", result.error);
      return { status: "error", message: `메일을 보내지 못했어요. (${result.error})` };
    }
  } catch (error) {
    // 환경변수(RESEND_API_KEY 등)가 없을 때
    const message = error instanceof Error ? error.message : String(error);
    console.error("[settings] test email:", message);
    return { status: "error", message };
  }

  return { status: "success", message: `${to} 로 카드 ${cards.length}개 메일을 보냈어요. 메일함을 확인해 주세요.` };
}
