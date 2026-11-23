import { PagePlaceholder } from "@/components/page-placeholder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PagePlaceholder
      title="설정"
      stage="5단계"
      description="복습 메일 켜기/끄기와 하루 최대 카드 수를 바꿀 수 있어요."
    >
      <Card>
        <CardHeader>
          <CardTitle>계정</CardTitle>
          <CardDescription>{user?.email ?? "로그인 정보를 불러오지 못했어요."}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full sm:w-auto">
              로그아웃
            </Button>
          </form>
        </CardContent>
      </Card>
    </PagePlaceholder>
  );
}
