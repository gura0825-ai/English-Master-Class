-- =============================================================
-- 공부한 날 목록 (홈의 '연속 학습일' 계산용)
-- 복습한 날(reviews, 서울 날짜) + 노트를 기록한 날(notes.study_date)
-- security invoker: 호출한 사람 권한으로 실행되어 RLS 가 그대로 적용된다
-- Supabase SQL Editor에 붙여넣고 Run (여러 번 실행해도 안전)
-- =============================================================

create or replace function public.study_days(p_since date)
returns table (day date)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct d.day
  from (
    select (r.reviewed_at at time zone 'Asia/Seoul')::date as day
    from public.reviews r
    where r.user_id = (select auth.uid())
      and r.reviewed_at >= (p_since::timestamp at time zone 'Asia/Seoul')
    union all
    select n.study_date
    from public.notes n
    where n.user_id = (select auth.uid())
      and n.study_date >= p_since
  ) d
  order by d.day desc;
$$;

revoke execute on function public.study_days(date) from public, anon;
grant execute on function public.study_days(date) to authenticated;
