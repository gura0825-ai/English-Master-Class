import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl text-primary">English Master Class</CardTitle>
          <CardDescription>이메일로 로그인 링크를 보내드려요. (2단계에서 연결 예정)</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3">
            <label htmlFor="email" className="text-sm font-medium">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              disabled
              className="h-12 rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            />
            <Button type="submit" disabled>
              로그인 링크 받기
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
