create or replace function public.delete_link_and_gc(
  p_link_id uuid,
  p_summary_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_summaries where id = p_link_id;
  perform public.delete_summary_if_orphan(p_summary_id);
end $$;
