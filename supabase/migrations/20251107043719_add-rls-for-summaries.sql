-- summaries
alter table public.summaries enable row level security;

-- 공개본 읽기
create policy "read_public_summaries"
on public.summaries
for select
to authenticated
using (is_private = false);

-- 개인본 읽기: user_summaries 링크가 있는 경우만
create policy "read_private_via_link"
on public.summaries
for select
to authenticated
using (
  is_private = true
  and exists (
    select 1
    from public.user_summaries us
    where us.summary_id = summaries.id
      and us.user_id = auth.uid()
  )
);

-- 개인본 생성은 서버 라우트에서만 수행한다면, authenticated insert 정책은 생략
-- 공개본 insert/update도 서비스 롤에서만 하므로 정책 불필요

-- user_summaries
alter table public.user_summaries enable row level security;

-- 본인 링크만 조회
create policy "read_own_links"
on public.user_summaries
for select
to authenticated
using (user_id = auth.uid());

-- 본인 링크만 생성
create policy "insert_own_links"
on public.user_summaries
for insert
to authenticated
with check (user_id = auth.uid());
