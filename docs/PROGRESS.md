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
- `lib/supabase/{server,client,middleware,env}.ts`, 루트 `middleware.ts`
  - 공개 경로: `/login`, `/auth/*`, `/r/*`, `/api/cron/*` (나머지는 미로그인 시 `/login?next=…`)
- `/login` (Server Action `app/login/actions.ts` + zod), `/auth/callback`(token_hash·code 둘 다), `/auth/signout`(POST)
- 설정 화면에 계정 이메일 + 로그아웃
- 사용자 PC에서 매직링크 로그인 성공 확인

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

## 다음: 3단계 — 학습 노트
"기능 F02~F05를 만들어줘: /notes 목록(검색·태그 필터), /notes/new 작성(카드 여러 개 입력 +
'표현 — 뜻' 형식 한꺼번에 붙여넣기), /notes/[id] 상세·수정·삭제. Server Actions와 zod 검증을 써줘.
새 카드는 stage 0, next_review_date = 내일(KST)."
- 3단계에서 date-fns + date-fns-tz 설치 필요 (KST '오늘' 계산)
