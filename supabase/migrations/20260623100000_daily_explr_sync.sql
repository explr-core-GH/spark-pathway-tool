-- Daily ExplrMore roster sync.
--
-- Schedules the sync-explr edge function (deployed from
-- supabase/functions/sync-explr) to run every day at 08:00 UTC via pg_cron +
-- pg_net. The function is deployed with verify_jwt = false (see config.toml),
-- so the call needs no key here. Each run logs to public.sync_runs
-- (kind = 'explr_roster'), which powers the "Last synced" line on
-- Admin → Import from ExplrMore.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-scheduling with the same jobname replaces it, but unschedule first for
-- older pg_cron versions where schedule() would duplicate.
do $$
begin
  perform cron.unschedule('sync-explr-daily');
exception when others then
  null; -- nothing scheduled yet
end$$;

select cron.schedule(
  'sync-explr-daily',
  '0 8 * * *',  -- daily 08:00 UTC ≈ 3–4am US Eastern
  $$
  select net.http_post(
    url := 'https://jpgxslmwuiamjabsxbuz.supabase.co/functions/v1/sync-explr',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
