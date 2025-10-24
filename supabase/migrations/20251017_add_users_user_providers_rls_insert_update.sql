-- enable extension (if not enabled)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- users
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

-- trigger for updated_at
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

-- user_providers
create table if not exists public.user_providers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    provider text not null check (provider in ('google','kakao')),
    provider_user_id text not null,
    provider_email text null,
    profile_json jsonb null,
    linked_at timestamptz not null default now()
);
create unique index if not exists user_providers_unique_provider_uid
on public.user_providers(provider, provider_user_id);
create index if not exists user_providers_user_id_idx
on public.user_providers(user_id);

-- RLS
alter table public.users enable row level security;
alter table public.user_providers enable row level security;

-- users policies
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

-- user_providers policies
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