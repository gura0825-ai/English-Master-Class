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

### 3단계 — 학습 노트 (2026-11-24, 사용자 PC 실사용 확인 대기)
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

## 다음: 4단계 — 복습
"lib/srs.ts를 CLAUDE.md의 SRS 규칙대로 만들고 vitest 테스트를 작성해줘. /review에 오늘 볼 카드를
플래시카드로 보여주고 [모름][헷갈림][기억남]을 누르면 cards를 갱신하고 reviews에 기록해줘.
홈(/)에 오늘 볼 카드 수와 최근 노트를 보여줘."
- lib/srs.ts 에는 이미 INTERVALS, MAX_STAGE, newCardSchedule 이 있음 → schedule(stage, rating) 추가
