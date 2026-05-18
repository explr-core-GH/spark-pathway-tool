-- Per Jordan: no scheduled syncs. The /worksites page's 'Sync now' button
-- is the only way the sync-worksites edge function gets invoked.
--
-- This migration:
--   1. Unschedules the hourly job created by the prior migration
--   2. Drops the helper function that pg_cron was calling
-- The pg_cron / pg_net extensions are left enabled — they're harmless when
-- no jobs are scheduled, and other features may use them later.

do $$
begin
  perform cron.unschedule('sync-worksites-hourly');
exception when others then
  -- nothing to unschedule (already removed or never created)
  null;
end$$;

drop function if exists public.sync_worksites_via_cron();
