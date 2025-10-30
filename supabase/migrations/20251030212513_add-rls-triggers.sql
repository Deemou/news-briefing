-- 1) Extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 2) Helper function: updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 3) Triggers
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

-- 4) Constraints Prisma가 표현하기 어려운 CHECK
alter table public.user_providers
  drop constraint if exists user_providers_provider_check;
alter table public.user_providers
  add constraint user_providers_provider_check
  check (provider in ('google','kakao'));

-- 5) RLS enable
alter table public.users enable row level security;
alter table public.user_providers enable row level security;
alter table public.summaries enable row level security;
alter table public.user_summaries enable row level security;

-- 6) Policies (idempotent)
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
for select using (id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
for update using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
for insert with check (id = auth.uid());

drop policy if exists providers_select_own on public.user_providers;
create policy providers_select_own on public.user_providers
for select using (user_id = auth.uid());

drop policy if exists providers_insert_own on public.user_providers;
create policy providers_insert_own on public.user_providers
for insert with check (user_id = auth.uid());

drop policy if exists providers_update_own on public.user_providers;
create policy providers_update_own on public.user_providers
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

-- summaries는 클라이언트 직접 접근 차단
drop policy if exists summaries_select_own on public.summaries;
drop policy if exists summaries_insert_own on public.summaries;
drop policy if exists summaries_update_own on public.summaries;
drop policy if exists summaries_delete_own on public.summaries;

drop policy if exists summaries_no_client_access on public.summaries;
create policy summaries_no_client_access on public.summaries
  for all
  to authenticated
  using (false)
  with check (false);

-- user_summaries 정책
drop policy if exists user_summaries_select_own on public.user_summaries;
create policy user_summaries_select_own on public.user_summaries
for select using (user_id = auth.uid());

drop policy if exists user_summaries_insert_own on public.user_summaries;
create policy user_summaries_insert_own on public.user_summaries
for insert with check (user_id = auth.uid());

drop policy if exists user_summaries_update_own on public.user_summaries;
create policy user_summaries_update_own on public.user_summaries
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists user_summaries_delete_own on public.user_summaries;
create policy user_summaries_delete_own on public.user_summaries
for delete using (user_id = auth.uid());
