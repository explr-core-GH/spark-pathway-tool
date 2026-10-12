-- Daily ExplrMore camp sync as an admin toggle.
--
-- The job (pg_cron → pg_net → the sync-explr edge function at 08:00 UTC)
-- is created or removed by set_daily_explr_sync(); nothing is scheduled by
-- this migration, so the sync stays off until an admin turns it on from
-- Admin → Library → Import from ExplrMore.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.daily_explr_sync_enabled()
returns boolean
language sql
stable
security definer
set search_path = public, cron
as $$
  select exists (select 1 from cron.job where jobname = 'sync-explr-daily');
$$;
revoke all on function public.daily_explr_sync_enabled() from public;
grant execute on function public.daily_explr_sync_enabled() to authenticated;

create or replace function public.set_daily_explr_sync(_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public, cron
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Admin access required';
  end if;
  if exists (select 1 from cron.job where jobname = 'sync-explr-daily') then
    perform cron.unschedule('sync-explr-daily');
  end if;
  if _enabled then
    perform cron.schedule(
      'sync-explr-daily',
      '0 8 * * *',  -- daily 08:00 UTC, 3-4am US Eastern
      $job$
      select net.http_post(
        url := 'https://jpgxslmwuiamjabsxbuz.supabase.co/functions/v1/sync-explr',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $job$
    );
  end if;
  return _enabled;
end $$;
revoke all on function public.set_daily_explr_sync(boolean) from public;
grant execute on function public.set_daily_explr_sync(boolean) to authenticated;

notify pgrst, 'reload schema';
