drop policy if exists insert_private_summaries_by_user on public.summaries;

create policy insert_private_summaries_by_user
on public.summaries
for insert
to authenticated
with check (is_private = true);
