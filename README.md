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
