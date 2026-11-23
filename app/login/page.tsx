import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./login-form";

const ERROR_MESSAGES: Record<string, string> = {
  link: "로그인 링크가 만료되었거나 이미 사용되었어요. 새 링크를 받아 주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? "로그인에 실패했어요. 다시 시도해 주세요.") : null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl text-primary">English Master Class</CardTitle>
          <CardDescription>비밀번호 없이, 이메일로 받은 링크를 눌러 로그인해요.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errorMessage && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <LoginForm next={next} />
        </CardContent>
      </Card>
    </main>
  );
}
