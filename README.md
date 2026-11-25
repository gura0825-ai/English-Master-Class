# English Master Class

매일 공부한 영어 표현을 기록하고 간격 반복으로 복습 메일을 받는 개인용 웹앱. 규칙과 설계는 `CLAUDE.md` 참고.

## 실행

```bash
npm install
cp .env.example .env.local   # 값 채우기 (2단계부터 필요)
npm run dev                  # http://localhost:3000
```

## 화면 경로

| 경로 | 화면 |
| --- | --- |
| `/login` | 로그인 |
| `/` | 홈(대시보드) |
| `/notes` | 노트 목록 |
| `/notes/new` | 노트 작성 |
| `/notes/[id]` | 노트 상세·수정 |
| `/review` | 오늘의 복습 |
| `/settings` | 설정 |

## 테스트

```bash
npm test
```

## Supabase 설정 (2단계)

1. **테이블 만들기**: Supabase 대시보드 → SQL Editor → New query에 아래 파일을 **순서대로** 하나씩 붙여넣고 **Run**.
   1. `supabase/migrations/20261123000000_init.sql` (한 번만)
   2. `supabase/migrations/20261124000000_grants.sql` (테이블 권한. 여러 번 실행해도 안전)
   3. `supabase/migrations/20261124010000_study_days.sql` (홈의 연속 학습일. 여러 번 실행해도 안전)
2. **키 넣기**: Project Settings → API Keys에서 값을 복사해 `.env.local`에 입력
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`(anon/publishable), `SUPABASE_SERVICE_ROLE_KEY`(service_role/secret)
3. **리다이렉트 주소 허용**: Authentication → URL Configuration
   - Site URL: `http://localhost:3000` (배포 후에는 배포 주소로 변경)
   - Redirect URLs: `http://localhost:3000/auth/callback` (배포 후 `https://…vercel.app/auth/callback` 추가)
4. **(권장) 메일 템플릿 변경**: Authentication → Emails → **Magic Link**와 **Confirm signup** 두 템플릿의 링크를 아래로 바꾼다.
   기본 템플릿은 링크를 요청한 브라우저에서만 로그인되는데, 이렇게 바꾸면 PC에서 요청하고 폰 메일 앱에서 눌러도 로그인된다.
   ```html
   <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">로그인하기</a>
   ```
5. **(선택) 첫 로그인 후 가입 막기**: Authentication → Sign In / Providers → "Allow new users to sign up" 끄기.
   혼자 쓰는 앱이라 다른 사람이 가입하지 못하게 한다.

> Supabase 기본 메일 발송은 시간당 몇 통으로 제한된다. 로그인 링크를 연달아 요청하면 "너무 자주 요청" 안내가 나온다.

## 복습 메일 설정 (5단계)

1. **Resend 가입** → API Keys → Create API Key(Sending access) → `.env.local`의 `RESEND_API_KEY`
2. `.env.local`에 `CRON_SECRET`, `REVIEW_TOKEN_SECRET`(각각 다른 임의 문자열), `NEXT_PUBLIC_APP_URL` 입력
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
3. `npm run dev` 재시작 → **설정 → [지금 테스트 메일 받기]** 로 바로 확인
4. 자동 발송 경로(cron)를 직접 호출해 보기 (Windows PowerShell은 `curl.exe`)
   ```bash
   curl.exe -H "Authorization: Bearer 여기에_CRON_SECRET" http://localhost:3000/api/cron/daily-review
   ```
   - 결과 `"sent":1` → 메일 발송 + `email_logs`에 기록. 같은 날 다시 호출하면 `already_sent`로 건너뜀
   - `"no_cards"` → 오늘 복습할 카드가 없음 (카드가 있을 때만 보냄)
   - 다시 보내 보려면 SQL Editor에서 `delete from public.email_logs where sent_date = (now() at time zone 'Asia/Seoul')::date;`
5. 배포 후에는 `vercel.json`의 cron(`0 22 * * *` = 매일 07시대 KST)이 자동으로 호출한다.
   Vercel 환경변수에 `CRON_SECRET`이 있으면 Vercel이 인증 헤더를 붙여 준다.

메일의 [웹에서 플래시카드로 복습하기] 버튼은 `/r/[token]`을 연다. 로그인 없이 그날 카드만 평가할 수 있고
(평가는 버튼 = POST로만 저장), 링크는 보낸 날부터 3일 동안 유효하다.

### (선택) 로그인 메일도 Resend로 보내기
Supabase → Authentication → Emails → **SMTP Settings**: Host `smtp.resend.com`, Port `465`,
Username `resend`, Password = Resend API key, Sender = `onboarding@resend.dev`.
연결하면 Magic Link 템플릿을 고칠 수 있다 → 링크를 아래로 바꾸면 폰 메일 앱에서도 로그인된다.
```html
<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">로그인하기</a>
```
