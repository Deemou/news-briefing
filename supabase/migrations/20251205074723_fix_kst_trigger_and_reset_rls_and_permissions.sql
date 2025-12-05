begin;

-- 0) 확장 기능 확인 (필요 시)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 1) Updated At 함수 및 트리거 재설정
create or replace function public.setupdatedat()
returns trigger language plpgsql as $$
begin
  new.updated_at = (now() at time zone 'Asia/Seoul');
  return new;
end;
$$;

-- users 트리거
drop trigger if exists userssetupdatedat on public.users;
create trigger userssetupdatedat before update on public.users
for each row execute function public.setupdatedat();

-- summaries 트리거
drop trigger if exists summariessetupdatedat on public.summaries;
create trigger summariessetupdatedat before update on public.summaries
for each row execute function public.setupdatedat();

-- user_summaries 트리거
drop trigger if exists usersummariessetupdatedat on public.user_summaries;
create trigger usersummariessetupdatedat before update on public.user_summaries
for each row execute function public.setupdatedat();


-- 2) 모든 주요 테이블 RLS ON (명시 재적용)
alter table public.users             enable row level security;
alter table public.user_providers   enable row level security;
alter table public.user_summaries   enable row level security;
alter table public.summaries        enable row level security;
alter table public.summary_usage_daily enable row level security;


-- 3) users: 본인만
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users for select to authenticated using (id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users for insert to authenticated with check (id = auth.uid());


-- 4) user_providers: 본인만
drop policy if exists providers_select_own on public.user_providers;
create policy providers_select_own on public.user_providers for select to authenticated using (user_id = auth.uid());

drop policy if exists providers_insert_own on public.user_providers;
create policy providers_insert_own on public.user_providers for insert to authenticated with check (user_id = auth.uid());

drop policy if exists providers_update_own on public.user_providers;
create policy providers_update_own on public.user_providers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- 5) user_summaries: 본인만
drop policy if exists read_own_links on public.user_summaries;
create policy read_own_links on public.user_summaries for select to authenticated using (user_id = auth.uid());

drop policy if exists insert_own_links on public.user_summaries;
create policy insert_own_links on public.user_summaries for insert to authenticated with check (user_id = auth.uid());

drop policy if exists update_own_links on public.user_summaries;
create policy update_own_links on public.user_summaries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists delete_own_links on public.user_summaries;
create policy delete_own_links on public.user_summaries for delete to authenticated using (user_id = auth.uid());


-- 6) summaries: 서비스 전용 (admin/server 전용)
drop policy if exists summaries_write_by_server on public.summaries;
create policy summaries_write_by_server on public.summaries for all to service_role using (true) with check (true);


-- 7) summary_usage_daily: 본인만
drop policy if exists read_own_daily_usage on public.summary_usage_daily;
create policy read_own_daily_usage on public.summary_usage_daily for select to authenticated using (user_id = auth.uid());

drop policy if exists write_own_daily_usage on public.summary_usage_daily;
create policy write_own_daily_usage on public.summary_usage_daily for insert to authenticated with check (user_id = auth.uid());

drop policy if exists update_own_daily_usage on public.summary_usage_daily;
create policy update_own_daily_usage on public.summary_usage_daily for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- 8) GRANT 재확인
grant usage on schema public to authenticated;
grant select on table public.users to authenticated;
grant select on table public.user_providers to authenticated;
grant select, insert, update, delete on table public.user_summaries to authenticated; -- update 추가 (혹시 몰라서)
grant select, insert, update on table public.summary_usage_daily to authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;


-- 9) 기본 권한(Default Privileges) 재확인
alter default privileges in schema public grant select on tables to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select, update on sequences to service_role;

commit;
