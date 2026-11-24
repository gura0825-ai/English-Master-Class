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

## Supabase 설정 (2단계)

1. **테이블 만들기**: Supabase 대시보드 → SQL Editor → New query에 아래 파일을 **순서대로** 하나씩 붙여넣고 **Run**.
   1. `supabase/migrations/20261123000000_init.sql` (한 번만)
   2. `supabase/migrations/20261124000000_grants.sql` (테이블 권한. 여러 번 실행해도 안전)
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
