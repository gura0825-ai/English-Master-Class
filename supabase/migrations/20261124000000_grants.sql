-- =============================================================
-- 테이블 권한(GRANT) 명시
-- 최근 Supabase 프로젝트는 새 테이블을 Data API 역할에 자동으로 열어 주지 않는다.
-- 권한이 없으면 RLS 이전에 "permission denied for table …" (42501) 로 막힌다.
-- 행 단위 접근은 여전히 RLS 정책(내 데이터만)이 제한한다.
-- Supabase SQL Editor에 붙여넣고 Run (여러 번 실행해도 안전)
-- =============================================================

grant usage on schema public to authenticated, service_role;

-- 로그인 사용자 (RLS 정책과 같은 범위)
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.cards to authenticated;
grant select, insert                 on public.reviews to authenticated;
grant select                         on public.email_logs to authenticated;
grant select                         on public.profiles to authenticated;
-- profiles 는 설정 컬럼만 수정 가능 (id·email 고정)
grant update (timezone, email_enabled, send_hour, daily_limit) on public.profiles to authenticated;

-- 서버 전용(cron, service role key): RLS 는 우회하지만 테이블 권한은 필요하다
grant select, insert, update, delete
  on public.profiles, public.notes, public.cards, public.reviews, public.email_logs
  to service_role;

-- 비로그인(anon)은 아무 테이블도 쓰지 않는다
revoke all on public.profiles, public.notes, public.cards, public.reviews, public.email_logs
  from anon;
