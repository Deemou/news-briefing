-- 0) 트랜잭션
begin;

-- 1) 모든 주요 테이블 RLS ON (명시 재적용)
alter table public.users            enable row level security;
alter table public.user_providers   enable row level security;
alter table public.user_summaries   enable row level security;
alter table public.summaries        enable row level security;

-- 2) users: 본인만
drop policy if exists users_select_own on public.users;
create policy users_select_own
on public.users
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists users_update_own on public.users;
create policy users_update_own
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists users_insert_own on public.users;
create policy users_insert_own
on public.users
for insert
to authenticated
with check ((select auth.uid()) = id);

-- 3) user_providers: 본인만
drop policy if exists providers_select_own on public.user_providers;
create policy providers_select_own
on public.user_providers
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists providers_insert_own on public.user_providers;
create policy providers_insert_own
on public.user_providers
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists providers_update_own on public.user_providers;
create policy providers_update_own
on public.user_providers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 4) user_summaries: 본인만
drop policy if exists read_own_links on public.user_summaries;
create policy read_own_links
on public.user_summaries
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists insert_own_links on public.user_summaries;
create policy insert_own_links
on public.user_summaries
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists update_own_links on public.user_summaries;
create policy update_own_links
on public.user_summaries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists delete_own_links on public.user_summaries;
create policy delete_own_links
on public.user_summaries
for delete
to authenticated
using (user_id = auth.uid());

-- 5) summaries: 서비스 전용
-- 클라이언트에서 summaries 직접 읽기/쓰기 금지. 서버(admin)만 접근.
drop policy if exists summaries_write_by_server on public.summaries;
create policy summaries_write_by_server
on public.summaries
for all
to service_role
using (true)
with check (true);

-- 6) GRANT 재확인 (이미 부여되어도 무해)
grant usage on schema public to authenticated;
grant select on table public.users to authenticated;
grant select on table public.user_providers to authenticated;
grant select, insert on table public.user_summaries to authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;

-- 7) 기본 권한(Default Privileges) 재확인
alter default privileges in schema public grant select on tables to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select, update on sequences to service_role;

commit;
