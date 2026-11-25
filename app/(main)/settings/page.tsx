import { SettingsForm, TestEmailButton } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateKo, todayInSeoul } from "@/lib/dates";
import { DEFAULT_DAILY_LIMIT } from "@/lib/review/queries";
import { describeDbError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

type EmailLog = { sent_date: string; card_count: number; status: "sent" | "failed" | "skipped" };

const STATUS_LABEL: Record<EmailLog["status"], string> = {
  sent: "보냄",
  failed: "실패",
  skipped: "건너뜀",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile, error: profileError }, { data: logs }] = await Promise.all([
    supabase.from("profiles").select("email, email_enabled, daily_limit").maybeSingle(),
    supabase
      .from("email_logs")
      .select("sent_date, card_count, status")
      .order("sent_date", { ascending: false })
      .limit(7)
      .returns<EmailLog[]>(),
  ]);
  if (profileError) console.error("[settings] profile:", describeDbError(profileError));
  const today = todayInSeoul();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>복습 메일</CardTitle>
          <CardDescription>메일 속 버튼을 누르면 로그인 없이 그날 카드를 평가할 수 있어요.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            emailEnabled={profile?.email_enabled ?? true}
            dailyLimit={profile?.daily_limit ?? DEFAULT_DAILY_LIMIT}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>테스트 메일</CardTitle>
          <CardDescription>
            오늘 복습할 카드로 메일 한 통을 지금 바로 받아 봐요. (발송 기록에는 남지 않아요)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TestEmailButton />
          {logs && logs.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">최근 자동 발송 기록</p>
              <ul className="divide-y rounded-lg border text-sm">
                {logs.map((log) => (
                  <li key={log.sent_date} className="flex justify-between px-3 py-2">
                    <span>{formatDateKo(log.sent_date, today)}</span>
                    <span className={log.status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                      {STATUS_LABEL[log.status]}
                      {log.status === "sent" && ` · 카드 ${log.card_count}개`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계정</CardTitle>
          <CardDescription>{profile?.email || user?.email || "로그인 정보를 불러오지 못했어요."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              로그아웃
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
