# English Master Class

매일 공부한 영어 표현을 기록하고, 간격 반복(1/3/7/14/30/60/120일)으로
복습 메일을 보내는 개인용 웹앱. 전체 설계서: https://claude.ai/artifact/QwKsUvEziov8j3YewAXu6R

## Stack
- Next.js 15 (App Router, TypeScript, Server Actions), Tailwind CSS, shadcn/ui
- Supabase (Postgres, Auth 매직링크, RLS) — @supabase/ssr
- Resend + React Email (메일), Vercel (배포 + Cron)
- 날짜: date-fns + date-fns-tz, 모든 '오늘'은 Asia/Seoul 기준

## Rules
- UI 문구는 한국어, 코드·변수명은 영어
- 모든 테이블에 user_id + RLS(auth.uid() = user_id). service role key는 서버(cron)에서만
- DB 변경은 supabase/migrations/*.sql 로만
- 복습 로직은 lib/srs.ts 한 곳에만 두고 단위 테스트(vitest) 작성
- 모바일 우선 반응형, 버튼 높이 48px 이상
- 비밀값은 .env.local, 예시는 .env.example 에만

## Data model
profiles(id, email, timezone, email_enabled, send_hour, daily_limit)
notes(id, user_id, study_date, title, source, memo, tags[], created_at, updated_at)
cards(id, note_id, user_id, expression, meaning, example, my_note, type,
      stage 0-6, next_review_date, last_reviewed_at, review_count, lapse_count)
reviews(id, card_id, user_id, rating good|hard|again, via web|email,
        stage_before, stage_after, reviewed_at)
email_logs(id, user_id, sent_date, card_count, status, provider_message_id)
  unique(user_id, sent_date)

## SRS
INTERVALS = [1,3,7,14,30,60,120]
새 카드: stage 0, next = 내일
good: newStage = min(stage+1, 6), next = today + INTERVALS[newStage]
hard: stage 유지, next = today + max(1, floor(INTERVALS[stage]/2))
again: stage=0, next = tomorrow, lapse_count+1
매일 next_review_date <= today 인 카드를 오래된 순 daily_limit개

## Email
vercel.json cron "0 22 * * *" (= 07시 KST, Hobby는 해당 시간대 안 임의 시점) → /api/cron/daily-review (CRON_SECRET 확인)
메일 링크는 /r/[token] 페이지를 열고 POST 버튼으로만 평가 저장 (메일 스캐너의 링크 미리 열기 대비)
token = HMAC(user_id + date, REVIEW_TOKEN_SECRET), 3일 만료

## Env
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
RESEND_API_KEY, EMAIL_FROM, CRON_SECRET, REVIEW_TOKEN_SECRET, NEXT_PUBLIC_APP_URL
