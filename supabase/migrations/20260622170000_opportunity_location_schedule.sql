-- Structured location (lat/lng for a map pin) + structured schedule
-- (weekdays + start/end time) for opportunities, so the wizard uses pickers
-- instead of free-text and students see a map.

alter table public.opportunities
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists schedule_json jsonb;

notify pgrst, 'reload schema';
