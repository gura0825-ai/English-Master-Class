# 진행 상황

새 세션은 이 파일과 CLAUDE.md를 먼저 읽고 이어서 진행한다.
설계서 9장 "단계별 프롬프트" 순서(1~7단계)를 따른다.

## 완료

### 1단계 — 뼈대 (2026-11-23)
- Next.js 15 + TS + Tailwind v4 + shadcn/ui(new-york, neutral)
- 상단 메뉴 홈/노트/복습/설정 (`components/site-header.tsx`), 레이아웃은 `app/(main)/layout.tsx`
- 7장 경로의 빈 페이지: `/login`, `/`, `/notes`, `/notes/new`, `/notes/[id]`, `/review`, `/settings`
  (빈 페이지는 `components/page-placeholder.tsx` 사용 — 각 단계에서 실제 화면으로 교체)
- 포인트 색 인디고, Pretendard 글꼴(CDN), 버튼 높이 48px 이상(`components/ui/button.tsx`)

### 2단계 — DB·로그인 (2026-11-23)
- `supabase/migrations/20261123000000_init.sql` — Supabase SQL Editor에서 실행 완료
  - 테이블 5개 + RLS + 인덱스 + cascade, 가입 시 profiles 자동 생성, 이메일 변경 동기화
  - cards→notes, reviews→cards 는 (id, user_id) 복합 FK (남의 노트에 카드 못 붙임)
  - profiles 는 timezone/email_enabled/send_hour/daily_limit 컬럼만 수정 가능
  - cards.next_review_date 기본값 = 내일(KST), notes.study_date 기본값 = 오늘(KST)
- `supabase/migrations/20261124000000_grants.sql` — 테이블 GRANT 명시 (3단계 중 추가)
  - 최근 Supabase 프로젝트는 새 테이블 권한을 자동으로 주지 않아 42501 permission denied 발생 → 추가
  - 로컬 검증용 스텁도 자동 권한(default privileges) 없이 테스트해야 실제와 같음
- `lib/supabase/{server,client,middleware,env}.ts`, 루트 `middleware.ts`
  - 공개 경로: `/login`, `/auth/*`, `/r/*`, `/api/cron/*` (나머지는 미로그인 시 `/login?next=…`)
- `/login` (Server Action `app/login/actions.ts` + zod), `/auth/callback`(token_hash·code 둘 다), `/auth/signout`(POST)
- 설정 화면에 계정 이메일 + 로그아웃
- 사용자 PC에서 매직링크 로그인 성공 확인

### 3단계 — 학습 노트 (2026-11-24, 사용자 PC에서 작성·수정·검색·삭제 확인 완료)
- `/notes` 목록: 날짜순 20개씩 페이지, 검색(제목·출처·메모 + 카드 표현·뜻·예문), 태그 칩 필터
- `/notes/new` 작성, `/notes/[id]` 상세, `/notes/[id]?edit=1` 수정, 삭제(확인창, cascade)
- 공용 폼 `components/notes/note-form.tsx`: 카드 여러 줄, [한꺼번에 붙여넣기]
  - 파서 `lib/notes/quick-parse.ts`: `표현 — 뜻 — 예문(선택)`, 구분자 — – " - " 탭, 유형 자동 짐작
  - form action 대신 onSubmit+startTransition (React 19 자동 폼 초기화가 <select>를 되돌리는 문제 회피)
- Server Actions `app/(main)/notes/actions.ts` + zod 검증 `lib/notes/validation.ts`
  - 완전히 빈 카드 줄은 무시, 오류 키는 화면 줄 번호(cards.{i}.필드)
  - 새 카드: `lib/srs.ts`의 newCardSchedule(todayInSeoul()) → stage 0, 내일
  - 수정 시 기존 카드는 내용만 갱신(stage·다음 복습일 유지), 지운 카드 삭제, 새 카드 추가
  - 카드 순서용 별도 컬럼 없이 created_at 을 1ms씩 늘려 입력 순서 유지
  - 노트+카드 저장은 트랜잭션이 아님: 카드 저장 실패 시 노트를 지워 되돌림
- 메모는 react-markdown 으로 표시 (HTML 태그는 글자로)
- vitest 설정(`vitest.config.mts`, `npm test`): dates·srs·quick-parse·validation·search 21개 테스트
- DB 오류 로그는 `lib/supabase/errors.ts`의 describeDbError 사용 (PostgrestError 가 '{}'로 찍히는 문제)
- 노트 목록 카드 수는 cards(count) embed 대신 노트별 head count
- `lib/dates.ts`: todayInSeoul, addDaysToDateString, formatDateKo, relativeDayKo

### 4단계 — 복습 (2026-11-24, 사용자 PC에서 복습·홈·연속 학습일 확인 완료)
- `lib/srs.ts`: schedule(stage, rating), applyReview(card, rating, today) + 테스트(설계서 6장 1→4→11→25→55→115일 시나리오 포함)
- `/review`: 오늘 볼 카드(next_review_date <= 오늘, 오래된 순, profiles.daily_limit 장) 플래시카드
  - 탭/Space 로 뒤집기, [모름][헷갈림][기억남](키 1·2·3), 버튼에 다음 복습일 미리보기, 진행률, 종료 화면
  - 평가 즉시 다음 카드로 넘기고 저장은 뒤에서. 실패하면 한 번만 맨 뒤로 다시, 두 번째 실패는 건너뜀
  - 카드 목록은 처음 받은 것을 고정(서버 데이터가 바뀌어도 순서 유지), 액션에서 revalidatePath 안 함
- Server Action `app/(main)/review/actions.ts` submitReview: cards 갱신 + reviews(via web) 기록
  - next_review_date > 오늘이면 이미 평가한 것으로 보고 무시, update 는 stage·next_review_date 가 그대로일 때만(동시 평가 방지)
  - cards 갱신과 reviews 기록은 트랜잭션 아님 (이력 insert 실패 시 로그만)
- `lib/review/queries.ts`: getDailyLimit, getDueCards, countDueCards, getNextReview, getStudyStreak
- 홈(/): 오늘 볼 카드 수(밀린 카드 안내), 다음 복습일, 연속 학습일, 최근 노트 5개
- `supabase/migrations/20261124010000_study_days.sql`: study_days(p_since) 함수(security invoker)
  — 복습한 날(KST) + 노트 study_date. 연속 학습일 계산은 `lib/review/streak.ts`. 함수가 없으면 홈에서 숨김
- 테스트 34개

### 5단계 — 메일 (2026-11-25, 사용자 PC에서 테스트 메일·메일 평가·cron 호출 확인 완료)
- `emails/DailyReview.tsx`(React Email) + `lib/email/daily-review.ts`(제목·라벨·렌더) + `lib/email/send.ts`(Resend)
  - 제목 `[English Master Class] 오늘의 복습 N개 · 11월 25일`, 카드별 "첫 복습 · 1일 만에"/"3번째 · 7일 만에"
  - 버튼 하나(/r/[token]) + 설정 링크, plain text 버전 포함, viewport meta
- `/api/cron/daily-review` + `lib/cron/daily-review.ts`, `vercel.json` cron `0 22 * * *`
  - Bearer CRON_SECRET(timingSafeEqual), email_enabled 사용자 → 오늘 'sent' 기록 있으면 건너뜀
  - 볼 카드 없으면 보내지도 기록하지도 않음, Resend idempotencyKey `daily-review/{user}/{date}`
  - email_logs upsert(onConflict user_id,sent_date): 실패도 기록, 같은 날 재실행 시 실패분만 재시도
- `/r/[token]`(로그인 불필요, (main) 밖): `lib/review/token.ts` HMAC(`review:{user}:{date}`), 보낸 날 포함 3일
  - 카드 = 토큰 주인의 next_review_date <= 메일 날짜, daily_limit 장 (service role + user_id 직접 필터)
  - 평가는 Server Action(POST) `submitEmailReview`만, via 'email'. GET 은 보여주기만
  - noindex, referrer no-referrer(토큰이 외부 Referer 로 새지 않게)
- `lib/review/record.ts` recordReview: 웹·메일 공통 저장(dueBy 이후로 밀린 카드는 무시, 동시 평가 방지)
  - ReviewSession 은 submit 함수를 prop 으로 받음
- `lib/supabase/admin.ts`(service role, server-only), `lib/env.ts`(requireEnv, getAppUrl)
- `/settings`: 메일 켜기/끄기, 하루 최대 카드 수(1~200), [지금 테스트 메일 받기](RLS 사용자 권한, 기록 안 남김), 최근 발송 기록 7개
- `components/page-placeholder.tsx` 삭제 (모든 화면 구현 완료)
- vitest: JSX 변환을 위해 vitest.config.mts 에 oxc jsx automatic. 테스트 46개

## Supabase 설정 상태
- URL Configuration: Site URL `http://localhost:3000`, Redirect `http://localhost:3000/auth/callback` 설정 완료
- 메일 템플릿: 아직 기본값. Supabase가 커스텀 SMTP 없이는 템플릿 수정을 막음
  → 5단계에서 Resend SMTP(smtp.resend.com:465, user `resend`, pw = API key) 연결 후
  Magic Link 링크를 `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email` 로 변경 예정
  (그 전까지는 링크를 요청한 같은 브라우저에서만 로그인됨)
- 가입 막기("Allow new users to sign up" 끄기): 사용자 선택 사항, 미확인

## 사용자 PC (Windows) 메모
- 프로젝트 위치 `C:\Users\user\English-Master-Class`, 코드 받기는 `git pull`
- git 인증서 오류(SEC_E_CERT_EXPIRED) → `git config --global http.sslBackend openssl` 로 해결
- PC에 `NODE_TLS_REJECT_UNAUTHORIZED=0` 환경변수가 있었음 → 제거 권장함 (처리 여부 미확인)
- `npm audit`의 postcss 경고는 Next 내부 빌드 도구 문제. `npm audit fix --force` 금지(Next 16으로 올라감)

## 클라우드 작업 환경 메모
- `ui.shadcn.com` 접속이 막혀 `npx shadcn add`가 안 됨 → 컴포넌트를 shadcn 형식대로 직접 작성
- 실제 Supabase 키가 없으므로 동작 확인은 가짜 env로 빌드/리다이렉트 확인 + 로컬 Postgres로 SQL 검증
- 로그인이 필요한 화면은 여기서 열 수 없음 → 폼은 임시 공개 페이지로 화면·검증만 확인하고 삭제,
  실제 저장·목록·검색은 사용자 PC에서 확인 (PostgREST 바이너리 다운로드는 권한상 차단됨)

## 진행 중: 6단계 — 배포 (2026-11-25)
- 배포 절차·환경변수·Supabase 설정·점검 목록: `docs/DEPLOY.md`
- 배포 주소, 점검 결과는 확인되는 대로 여기에 기록

## 다음: 7단계 — 다듬기
"코드 전체를 검토해서 보안(RLS·토큰), 날짜/시간대 버그, 모바일 화면 문제를 찾아 고쳐줘."
