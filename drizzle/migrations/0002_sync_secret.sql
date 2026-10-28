-- The daily sync job sends a shared secret to the sync-explr edge function.
-- The value lives in Supabase Vault under the name `sync_secret` (create it
-- once with: select vault.create_secret('<value>', 'sync_secret');) and the
-- same value is set as SYNC_SECRET in the edge function's secrets.
-- Applied to the live project on 2026-10-28.

create or replace function public.set_daily_explr_sync(_enabled boolean) returns boolean
language plpgsql security definer set search_path to 'public', 'cron' as $fn$
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
      '0 8 * * *',
      $job$
      select net.http_post(
        url := 'https://jpgxslmwuiamjabsxbuz.supabase.co/functions/v1/sync-explr',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-sync-key', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_secret' limit 1)
        ),
        body := '{}'::jsonb
      );
      $job$
    );
  end if;
  return _enabled;
end $fn$;
