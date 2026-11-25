import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type DailyReviewEmailCard = {
  expression: string;
  meaning: string;
  example: string | null;
  /** 예: "3번째 · 7일 만에" */
  label: string;
};

export type DailyReviewEmailProps = {
  dateLabel: string; // "11월 25일 (수)"
  cards: DailyReviewEmailCard[];
  reviewUrl: string;
  settingsUrl: string;
  /** 하루 최대 카드 수를 넘어 밀린 카드 전체 수 (넘지 않으면 null) */
  backlog: number | null;
};

const PRIMARY = "#4f39f6"; // 앱 포인트 색(인디고)
const MUTED = "#737373";
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', sans-serif";

export function DailyReviewEmail({ dateLabel, cards, reviewUrl, settingsUrl, backlog }: DailyReviewEmailProps) {
  return (
    <Html lang="ko">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Preview>{`오늘 복습할 표현 ${cards.length}개: ${cards
        .slice(0, 3)
        .map((c) => c.expression)
        .join(", ")}`}</Preview>
      <Body style={{ backgroundColor: "#f5f5f5", fontFamily: FONT, margin: 0, padding: "24px 0" }}>
        <Container
          style={{ backgroundColor: "#ffffff", borderRadius: 12, maxWidth: 560, padding: "28px 24px" }}
        >
          <Text style={{ color: PRIMARY, fontSize: 14, fontWeight: 700, margin: 0 }}>English Master Class</Text>
          <Heading as="h1" style={{ fontSize: 22, margin: "8px 0 4px" }}>
            오늘의 복습 {cards.length}개
          </Heading>
          <Text style={{ color: MUTED, fontSize: 14, margin: 0 }}>
            {dateLabel}
            {backlog !== null && ` · 밀린 카드 ${backlog}개 중 오래된 순`}
          </Text>

          <Section style={{ marginTop: 20 }}>
            {cards.map((card, i) => (
              <Section
                key={i}
                style={{ borderTop: i === 0 ? "none" : "1px solid #eeeeee", padding: "14px 0" }}
              >
                <Text lang="en" style={{ fontSize: 20, fontWeight: 700, lineHeight: "28px", margin: 0 }}>
                  {card.expression}
                </Text>
                <Text style={{ color: "#404040", fontSize: 15, lineHeight: "22px", margin: "4px 0 0" }}>
                  {card.meaning}
                </Text>
                {card.example && (
                  <Text
                    lang="en"
                    style={{ color: MUTED, fontSize: 14, fontStyle: "italic", lineHeight: "20px", margin: "4px 0 0" }}
                  >
                    {card.example}
                  </Text>
                )}
                <Text style={{ color: "#a3a3a3", fontSize: 12, margin: "6px 0 0" }}>{card.label}</Text>
              </Section>
            ))}
          </Section>

          <Section style={{ marginTop: 16, textAlign: "center" }}>
            <Button
              href={reviewUrl}
              style={{
                backgroundColor: PRIMARY,
                borderRadius: 10,
                color: "#ffffff",
                display: "block",
                fontSize: 16,
                fontWeight: 700,
                padding: "16px 20px",
                textAlign: "center",
              }}
            >
              웹에서 플래시카드로 복습하기
            </Button>
            <Text style={{ color: MUTED, fontSize: 12, margin: "10px 0 0" }}>
              로그인 없이 오늘 카드만 평가할 수 있어요 · 링크는 3일 동안 유효해요
            </Text>
          </Section>

          <Hr style={{ borderColor: "#eeeeee", margin: "24px 0 12px" }} />
          <Text style={{ color: MUTED, fontSize: 12, margin: 0 }}>
            매일 아침 복습할 카드가 있을 때만 보내요.{" "}
            <Link href={settingsUrl} style={{ color: MUTED, textDecoration: "underline" }}>
              메일 설정 바꾸기
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// React Email 미리보기(email dev)용 예시 값
DailyReviewEmail.PreviewProps = {
  dateLabel: "11월 25일 (수)",
  backlog: null,
  reviewUrl: "http://localhost:3000/r/example",
  settingsUrl: "http://localhost:3000/settings",
  cards: [
    { expression: "break the ice", meaning: "어색함을 깨다", example: "Let's play a game to break the ice.", label: "첫 복습 · 1일 만에" },
    { expression: "serendipity", meaning: "뜻밖의 행운", example: null, label: "3번째 · 7일 만에" },
  ],
} satisfies DailyReviewEmailProps;

export default DailyReviewEmail;
