create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  email text null,
  avatar_url text null,
  is_active boolean not null default true,
  locale text null,
  last_login_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists users_email_unique_not_null
on public.users(email) where email is not null;

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
create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();

create table if not exists public.user_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null check (provider in ('google','kakao')),
  provider_user_id text not null,
  profile_json jsonb null,
  linked_at timestamptz not null default now()
);
create unique index if not exists user_providers_unique_provider_uid
on public.user_providers(provider, provider_user_id);
create index if not exists user_providers_user_id_idx
on public.user_providers(user_id);

alter table public.users enable row level security;
alter table public.user_providers enable row level security;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
for select
using (id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
for insert
with check (id = auth.uid());

drop policy if exists providers_select_own on public.user_providers;
create policy providers_select_own on public.user_providers
for select
using (user_id = auth.uid());

drop policy if exists providers_insert_own on public.user_providers;
create policy providers_insert_own on public.user_providers
for insert
with check (user_id = auth.uid());

drop policy if exists providers_update_own on public.user_providers;
create policy providers_update_own on public.user_providers
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create table if not exists public.summaries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(id) on delete cascade,
  source_url text null,
  site text null,
  title text null,
  article_published_at timestamptz null,
  article_text text not null,
  summary_text text not null,
  generator_version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists summaries_owner_created_idx
on public.summaries(created_by, created_at desc);

drop trigger if exists summaries_set_updated_at on public.summaries;
create trigger summaries_set_updated_at before update on public.summaries
for each row execute function public.set_updated_at();

create table if not exists public.user_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  summary_id uuid not null references public.summaries(id) on delete cascade,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, summary_id)
);
create index if not exists user_summaries_user_created_idx
on public.user_summaries(user_id, created_at desc);

drop trigger if exists user_summaries_set_updated_at on public.user_summaries;
create trigger user_summaries_set_updated_at before update on public.user_summaries
for each row execute function public.set_updated_at();

alter table public.summaries enable row level security;
alter table public.user_summaries enable row level security;

drop policy if exists summaries_select_own on public.summaries;
create policy summaries_select_own on public.summaries
for select using (created_by = auth.uid());

drop policy if exists summaries_insert_own on public.summaries;
create policy summaries_insert_own on public.summaries
for insert with check (created_by = auth.uid());

drop policy if exists summaries_update_own on public.summaries;
create policy summaries_update_own on public.summaries
for update using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists summaries_delete_own on public.summaries;
create policy summaries_delete_own on public.summaries
for delete using (created_by = auth.uid());

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
