import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PagePlaceholderProps = {
  title: string;
  description: string;
  stage: string;
  children?: React.ReactNode;
};

/** 1단계 뼈대용 빈 페이지. 각 단계에서 실제 화면으로 교체한다. */
export function PagePlaceholder({ title, description, stage, children }: PagePlaceholderProps) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>준비 중인 화면이에요</CardTitle>
          <CardDescription>{stage}에서 만들 예정</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </CardContent>
      </Card>
      {children}
    </section>
  );
}
