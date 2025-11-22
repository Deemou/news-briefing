create or replace function public.increment_today_summary_usage_count(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := current_date;
begin
  update public.summary_usage_daily
    set used_count = used_count + 1,
        last_used_at = now()
    where user_id = p_user_id and usage_date = v_date;
end $$;
