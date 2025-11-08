-- 0) 안전 모드
begin;

-- 1) 스키마/시퀀스/테이블 권한: service_role
grant usage on schema public to service_role;
grant select, insert, update on table public.summaries to service_role;
grant select, insert on table public.user_summaries to service_role;
grant usage, select, update on all sequences in schema public to service_role;

-- 2) 기본 권한(Default Privileges): service_role
alter default privileges in schema public
  grant select, insert, update on tables to service_role;
alter default privileges in schema public
  grant usage, select, update on sequences to service_role;

-- 3) 최소 권한: authenticated
grant usage on schema public to authenticated;
grant select on table public.summaries to authenticated;
grant select, insert on table public.user_summaries to authenticated;
grant usage, select on all sequences in schema public to authenticated;

commit;
