-- =============================================================
-- English Master Class — 초기 스키마
-- 테이블 5개(profiles, notes, cards, reviews, email_logs) + RLS + 인덱스 + 트리거
-- Supabase SQL Editor에 통째로 붙여넣고 Run 하면 된다. (한 번만 실행)
-- =============================================================

-- -------------------------------------------------------------
-- 공통: updated_at 자동 갱신
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -------------------------------------------------------------
-- profiles: 사용자 설정 (auth.users 와 1:1)
-- -------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  timezone      text not null default 'Asia/Seoul',
  email_enabled boolean not null default true,
  send_hour     smallint not null default 7 check (send_hour between 0 and 23),
  daily_limit   integer not null default 30 check (daily_limit between 1 and 200),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- notes: 하루 학습 기록
-- -------------------------------------------------------------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid()
             references public.profiles (id) on delete cascade,
  study_date date not null default ((now() at time zone 'Asia/Seoul')::date),
  title      text not null check (char_length(title) between 1 and 200),
  source     text check (char_length(source) <= 200),
  memo       text check (char_length(memo) <= 20000),
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- cards 가 (note_id, user_id) 로 참조해 남의 노트에 카드를 못 붙이게 한다
  unique (id, user_id)
);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- cards: 복습 단위(표현 하나)
-- -------------------------------------------------------------
create table public.cards (
  id               uuid primary key default gen_random_uuid(),
  note_id          uuid not null,
  user_id          uuid not null default auth.uid(),
  expression       text not null check (char_length(expression) between 1 and 500),
  meaning          text not null check (char_length(meaning) between 1 and 500),
  example          text check (char_length(example) <= 1000),
  my_note          text check (char_length(my_note) <= 2000),
  type             text not null default 'word'
                   check (type in ('word', 'idiom', 'sentence', 'grammar')),
  stage            smallint not null default 0 check (stage between 0 and 6),
  -- 새 카드는 내일(KST) 복습. 앱에서 값을 넣지만 빠뜨려도 안전하게 기본값을 둔다
  next_review_date date not null
                   default (((now() at time zone 'Asia/Seoul')::date) + 1),
  last_reviewed_at timestamptz,
  review_count     integer not null default 0 check (review_count >= 0),
  lapse_count      integer not null default 0 check (lapse_count >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- 노트 삭제 시 카드도 삭제. 카드의 user_id 는 노트 주인과 같아야 한다
  foreign key (note_id, user_id)
    references public.notes (id, user_id) on delete cascade,
  unique (id, user_id)
);

create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- reviews: 복습 이력
-- -------------------------------------------------------------
create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null,
  user_id      uuid not null default auth.uid(),
  rating       text not null check (rating in ('good', 'hard', 'again')),
  via          text not null default 'web' check (via in ('web', 'email')),
  stage_before smallint not null check (stage_before between 0 and 6),
  stage_after  smallint not null check (stage_after between 0 and 6),
  reviewed_at  timestamptz not null default now(),
  -- 카드 삭제(또는 노트 삭제 → 카드 삭제) 시 이력도 삭제
  foreign key (card_id, user_id)
    references public.cards (id, user_id) on delete cascade
);

-- -------------------------------------------------------------
-- email_logs: 하루 1통 중복 발송 방지 (쓰기는 cron 의 service role 만)
-- -------------------------------------------------------------
create table public.email_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  sent_date           date not null,
  card_count          integer not null default 0 check (card_count >= 0),
  status              text not null check (status in ('sent', 'failed', 'skipped')),
  provider_message_id text,
  created_at          timestamptz not null default now(),
  unique (user_id, sent_date)
);

-- -------------------------------------------------------------
-- 인덱스
-- -------------------------------------------------------------
-- 가장 자주 쓰는 조회: 오늘 볼 카드 (next_review_date <= today, 오래된 순)
create index cards_user_next_review_idx on public.cards (user_id, next_review_date);
create index cards_note_id_idx          on public.cards (note_id);
create index notes_user_study_date_idx  on public.notes (user_id, study_date desc);
create index notes_tags_idx             on public.notes using gin (tags);
create index reviews_card_id_idx        on public.reviews (card_id);
create index reviews_user_reviewed_idx  on public.reviews (user_id, reviewed_at desc);

-- -------------------------------------------------------------
-- RLS: 내 데이터만 읽고 쓰기
-- (select auth.uid()) 는 행마다 다시 계산하지 않도록 한 Supabase 권장 형태
-- -------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.notes      enable row level security;
alter table public.cards      enable row level security;
alter table public.reviews    enable row level security;
alter table public.email_logs enable row level security;

-- profiles: 조회·수정만. 생성은 트리거, 삭제는 auth.users 삭제 시 cascade
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- 설정 화면에서 바꿀 수 있는 컬럼만 수정 허용 (id·email 은 고정)
revoke update on public.profiles from authenticated, anon;
grant update (timezone, email_enabled, send_hour, daily_limit)
  on public.profiles to authenticated;

-- notes
create policy "notes_select_own" on public.notes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "notes_insert_own" on public.notes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "notes_update_own" on public.notes
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notes_delete_own" on public.notes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- cards
create policy "cards_select_own" on public.cards
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cards_insert_own" on public.cards
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cards_update_own" on public.cards
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "cards_delete_own" on public.cards
  for delete to authenticated using ((select auth.uid()) = user_id);

-- reviews: 이력은 추가·조회만 (수정·삭제 없음, 카드 삭제 시 cascade)
create policy "reviews_select_own" on public.reviews
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- email_logs: 조회만. 기록은 cron(service role, RLS 우회)만 한다
create policy "email_logs_select_own" on public.email_logs
  for select to authenticated using ((select auth.uid()) = user_id);

-- -------------------------------------------------------------
-- 회원가입 시 profiles 자동 생성
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 트리거 함수는 API 로 직접 호출하지 못하게 한다
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이메일을 바꾸면 profiles.email 도 따라 바꾼다 (복습 메일 수신 주소)
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- 이 SQL 을 실행하기 전에 이미 가입한 사용자가 있으면 profiles 를 채워 준다
insert into public.profiles (id, email)
select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;
