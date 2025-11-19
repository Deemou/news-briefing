create or replace function public.delete_summary_if_orphan(p_summary_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cnt integer;
begin
  perform 1 from public.summaries where id = p_summary_id and mode = 'fallback' for update;
  if not found then
    return false;
  end if;

  select count(*) into v_cnt from public.user_summaries where summary_id = p_summary_id;
  if v_cnt = 0 then
    delete from public.summaries where id = p_summary_id;
    return true;
  end if;
  return false;
end $$;
