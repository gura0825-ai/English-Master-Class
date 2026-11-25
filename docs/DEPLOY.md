# 배포 가이드 (Vercel)

코드는 이미 GitHub(`gura0825-ai/English-Master-Class`)에 있다. 이후로는 `main`에 push 할 때마다 Vercel이 자동으로 다시 배포한다.

## 1. Vercel 프로젝트 만들기

1. https://vercel.com → **Continue with GitHub** 로 가입/로그인 (Hobby 플랜, 무료)
2. **Add New… → Project**
3. 목록에 저장소가 없으면 **Adjust GitHub App Permissions**(또는 Install) → `English-Master-Class` 접근 허용
4. `English-Master-Class` 옆 **Import**
5. Framework Preset 은 **Next.js** 로 자동 인식. Root Directory·Build Command 는 그대로
6. **Environment Variables** 를 펼쳐 아래 2절의 8개를 넣는다 (**Deploy 누르기 전에**)
   - 팁: `.env.local` 내용을 통째로 복사해 첫 번째 Key 칸에 붙여넣으면 한 번에 나뉘어 들어간다
7. **Deploy** → 1~2분 뒤 완료

## 2. 환경변수 (Production)

| 이름 | 값 | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` 과 같음 | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` 과 같음 | |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` 과 같음 | 비밀 |
| `RESEND_API_KEY` | `.env.local` 과 같음 | 비밀 |
| `EMAIL_FROM` | `English Master Class <onboarding@resend.dev>` | 따옴표 없이 |
| `CRON_SECRET` | `.env.local` 과 같거나 새로 만든 값 | Vercel Cron 이 이 값으로 인증 헤더를 붙인다 |
| `REVIEW_TOKEN_SECRET` | `.env.local` 과 같거나 새로 만든 값 | 바꾸면 이미 보낸 메일 링크는 무효 |
| `NEXT_PUBLIC_APP_URL` | **배포 주소** `https://….vercel.app` | 끝에 `/` 없이. 메일 속 링크에 쓰임 |

- `NEXT_PUBLIC_` 로 시작하는 3개는 Type 을 **Config** 로 만든다. Secret 으로 만들면 Vercel 이 수정·저장을 막는다
  ("Remove the public framework prefix…"). Secret 은 Config 로 바꿀 수 없으니 **삭제 후 Config 로 다시 만든다**.
  나머지 5개(service role·Resend 키, CRON_SECRET, REVIEW_TOKEN_SECRET, EMAIL_FROM)는 Secret.
- `NEXT_PUBLIC_` 로 시작하는 값은 **빌드할 때** 코드에 들어간다. 바꾼 뒤에는 반드시 **Redeploy** 해야 반영된다.
- 배포 주소를 미리 모르면 일단 `https://english-master-class.vercel.app` 로 넣고, 배포 후 실제 주소를 확인해 고친 뒤 Redeploy.
  (Project → Settings → Environment Variables 에서 수정 → Deployments → 최신 항목 ⋯ → **Redeploy**)
- 환경변수를 빠뜨리면 모든 페이지가 500 오류가 난다 (Vercel → Logs 에 어떤 값이 없는지 나온다).

## 3. Supabase 설정

Authentication → **URL Configuration**

- **Site URL**: `https://(배포 주소)` 로 변경
- **Redirect URLs**: 아래 두 개가 모두 있어야 한다 (로컬 개발도 계속 쓰기 위해 localhost 유지)
  - `http://localhost:3000/auth/callback`
  - `https://(배포 주소)/auth/callback`

## 4. 배포 후 점검

- [ ] 배포 주소 접속 → `/login` 으로 이동
- [ ] **폰**에서 배포 주소로 로그인 (링크는 요청한 그 폰 브라우저에서 열기 — SMTP·템플릿 변경 전까지.
      Gmail 앱 안에서 열면 "로그인 링크가 만료되었거나…"가 난다 → 아래 6절)
- [ ] 노트 작성 → 상세 → 목록·검색
- [ ] Vercel → Project → **Settings → Cron Jobs** 에 `/api/cron/daily-review` (`0 22 * * *`) 가 보이는지
- [ ] Cron 수동 실행: Cron Jobs 화면의 **Run**, 또는
      `curl.exe -H "Authorization: Bearer (CRON_SECRET)" https://(배포 주소)/api/cron/daily-review`
- [ ] 받은 메일의 버튼이 **배포 주소**의 `/r/…` 로 열리는지 (localhost 면 `NEXT_PUBLIC_APP_URL` 수정 후 Redeploy)
- [ ] 다음 날 아침 07:00~07:59 사이 메일 도착 (스팸함이면 '스팸 아님')
- [ ] 홈 화면에 추가: 폰 브라우저 메뉴 → '홈 화면에 추가'

## 5. 운영

- **메일이 안 오면**: Vercel → Logs 에서 `/api/cron/daily-review` 실행 기록(`[cron] daily-review: {...}`) →
  Resend 대시보드 → Emails 순서로 본다. 설정 화면의 '최근 자동 발송 기록'에도 남는다.
  - `no_cards` = 그날 볼 카드가 없어 안 보냄(정상), `failed` = Resend 오류(메시지 확인)
- **Hobby 플랜 Cron**: 하루 1회, 지정 시각(UTC 22시)부터 1시간 안 임의 시점에 실행. Production 배포에서만 동작
- **Supabase 무료 플랜**: 1주일간 활동이 없으면 일시정지. 매일 Cron 이 DB를 읽으므로 보통 괜찮다.
  일시정지 경고 메일이 오면 대시보드에 한 번 들어가면 된다
- **코드 수정 반영**: `git push` → Vercel 자동 배포 (Deployments 에서 진행 확인)

## 6. 어느 기기에서 링크를 열어도 로그인되게 (권장)

기본 템플릿은 PKCE 방식이라 링크를 **요청한 브라우저**에서만 로그인된다.
Supabase 는 커스텀 SMTP 가 있어야 템플릿을 고칠 수 있으므로 Resend 를 연결한다.

1. Authentication → Emails → **Set up SMTP** → Enable custom SMTP
   - Sender email `onboarding@resend.dev`, Sender name `English Master Class`
   - Host `smtp.resend.com`, Port `465`, Username `resend`, Password = Resend API key
2. Authentication → Emails → **Magic Link** → Body **Source** 에서 링크를 바꾼다
   ```html
   <a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">로그인하기</a>
   ```
   (`/auth/callback` 은 token_hash 와 기존 code 방식을 모두 받는다. 로그인 요청 시 redirect 주소에 항상 `?next=` 를 붙이므로 `&` 로 이어 붙여도 된다)
3. PC 에서 요청 → 폰 Gmail 앱에서 열어 로그인되는지 확인

`onboarding@resend.dev` 는 Resend 가입 이메일로만 보낼 수 있다. 다른 주소로 보내려면 Resend 에 도메인을 인증한다.
