-- 0) 안전 모드
begin;

-- 1) 확장/트리거/기본 구성(이미 있다면 생략 가능)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists summaries_set_updated_at on public.summaries;
create trigger summaries_set_updated_at
before update on public.summaries
for each row execute function public.set_updated_at();

drop trigger if exists user_summaries_set_updated_at on public.user_summaries;
create trigger user_summaries_set_updated_at
before update on public.user_summaries
for each row execute function public.set_updated_at();

-- 2) RLS 활성화
alter table public.users enable row level security;
alter table public.user_providers enable row level security;
alter table public.summaries enable row level security;
alter table public.user_summaries enable row level security;

-- 3) 기존 전면 차단 정책 제거(충돌 방지)
drop policy if exists summaries_no_client_access on public.summaries;

-- 4) summaries 읽기 정책(공개/개인 링크 기반)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'summaries' and policyname = 'read_public_summaries'
  ) then
    create policy read_public_summaries
    on public.summaries
    for select
    to authenticated
    using (is_private = false);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'summaries' and policyname = 'read_private_via_link'
  ) then
    create policy read_private_via_link
    on public.summaries
    for select
    to authenticated
    using (
      is_private = true
      and exists (
        select 1 from public.user_summaries us
        where us.summary_id = summaries.id
          and us.user_id = auth.uid()
      )
    );
  end if;
end$$;

-- 5) summaries 개인본 INSERT 정책(서비스 롤 전용 권장)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'summaries' and policyname = 'insert_private_summaries_by_server'
  ) then
    create policy insert_private_summaries_by_server
    on public.summaries
    for insert
    to service_role
    with check (is_private = true);
  end if;
end$$;

-- 6) user_summaries 정책(본인만 접근/생성)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_summaries' and policyname = 'read_own_links'
  ) then
    create policy read_own_links
    on public.user_summaries
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'user_summaries' and policyname = 'insert_own_links'
  ) then
    create policy insert_own_links
    on public.user_summaries
    for insert
    to authenticated
    with check (user_id = auth.uid());
  end if;
end$$;

-- 7) 성능 인덱스 보조(존재 시 생략)
create index if not exists idx_user_summaries_summary_user
on public.user_summaries(summary_id, user_id);

-- 8) 부분 유니크/보조 인덱스(이미 추가되어 있으면 skip)
do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'uniq_summaries_source_url_public'
      and n.nspname = 'public'
  ) then
    create unique index uniq_summaries_source_url_public
      on public.summaries(source_url)
      where is_private = false;
  end if;
end$$;

create index if not exists idx_summaries_url_private
  on public.summaries(source_url, is_private);

create index if not exists summaries_content_hash_idx
  on public.summaries(content_hash);

commit;
