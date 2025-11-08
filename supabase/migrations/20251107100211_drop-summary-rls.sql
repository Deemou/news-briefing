-- 1) summaries: RLS 유지 + is_private 의존 정책 삭제
alter table public.summaries enable row level security;

drop policy if exists read_public_summaries on public.summaries;
drop policy if exists read_private_via_link on public.summaries;

-- 서버 전용 접근(쓰기 전용; 필요 시 select도 서버만)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='summaries' and policyname='summaries_write_by_server'
  ) then
    create policy summaries_write_by_server
    on public.summaries
    for all
    to service_role
    using (true)
    with check (true);
  end if;
end$$;

-- 2) user_summaries: RLS 그대로 + 컬럼 레벨 업데이트 제한(선택)
alter table public.user_summaries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='user_summaries' and policyname='read_own_links'
  ) then
    create policy read_own_links
    on public.user_summaries
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='user_summaries' and policyname='insert_own_links'
  ) then
    create policy insert_own_links
    on public.user_summaries
    for insert
    to authenticated
    with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='user_summaries' and policyname='update_own_links'
  ) then
    create policy update_own_links
    on public.user_summaries
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='user_summaries' and policyname='delete_own_links'
  ) then
    create policy delete_own_links
    on public.user_summaries
    for delete
    to authenticated
    using (user_id = auth.uid());
  end if;
end$$;

-- 3) 컬럼 레벨 업데이트 권한 보강(선택)
revoke update on table public.user_summaries from authenticated;
grant update (pinned, fallback_title, fallback_site, last_requested_at) on table public.user_summaries to authenticated;
