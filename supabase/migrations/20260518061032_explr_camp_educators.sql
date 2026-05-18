-- ExplrMore camp instances → educator assignments.
-- explr_camps tracks real-world camp instances pulled from ExplrMore's
-- registration system. Each instance can have one or more EXPLR educators
-- assigned to run it; that mapping lives here so we can route rosters to
-- the right educator dashboards without educators ever touching ExplrMore.

create table if not exists public.explr_camp_educators (
  explr_camp_id uuid not null references public.explr_camps(id) on delete cascade,
  educator_id uuid not null references public.educators(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.educators(id) on delete set null,
  primary key (explr_camp_id, educator_id)
);

create index if not exists idx_explr_camp_educators_camp on public.explr_camp_educators(explr_camp_id);
create index if not exists idx_explr_camp_educators_educator on public.explr_camp_educators(educator_id);

alter table public.explr_camp_educators enable row level security;

-- Admins manage assignments fully.
drop policy if exists "explr_camp_educators admin write" on public.explr_camp_educators;
create policy "explr_camp_educators admin write" on public.explr_camp_educators
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Educators can read assignments where they're the educator (for their own
-- dashboards). Admins also read all (via the OR).
drop policy if exists "explr_camp_educators read" on public.explr_camp_educators;
create policy "explr_camp_educators read" on public.explr_camp_educators
  for select using (educator_id = auth.uid() or public.is_admin(auth.uid()));

notify pgrst, 'reload schema';
