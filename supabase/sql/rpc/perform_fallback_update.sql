begin;

create or replace function public.perform_fallback_update(
  p_user_id uuid,
  p_source_url text,
  p_target_summary_id uuid,
  p_old_summary_id uuid,
  p_fallback_title text,
  p_fallback_site text
) returns public.user_summaries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.user_summaries;
begin
  insert into public.user_summaries (
    user_id, summary_id, source_url, fallback_title, fallback_site, last_requested_at
  )
  values (p_user_id, p_target_summary_id, p_source_url, p_fallback_title, p_fallback_site, now())
  on conflict (user_id, source_url)
  do update set
    summary_id        = excluded.summary_id,
    fallback_title    = coalesce(excluded.fallback_title, public.user_summaries.fallback_title),
    fallback_site     = coalesce(excluded.fallback_site,  public.user_summaries.fallback_site),
    last_requested_at = now()
  returning * into v_link;

  if p_old_summary_id is not null and p_old_summary_id <> p_target_summary_id then
    perform public.delete_summary_if_orphan(p_old_summary_id);
  end if;

  return v_link;
end $$;

commit;
