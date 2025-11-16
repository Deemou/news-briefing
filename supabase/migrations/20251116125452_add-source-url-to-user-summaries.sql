begin;

alter table public.user_summaries enable row level security;

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

commit;
