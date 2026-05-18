-- ExplrMore camp instances → multiple curriculum items.
--
-- Previously explr_camps.linked_camp_slug could only point at one curriculum
-- camp. A real instance often pairs with several (e.g. an underwater-robotics
-- camp running both Seaperch + MicroClimate curricula). Move to a join table;
-- backfill from the existing single-value column; leave the column in place
-- as legacy for now.

create table if not exists public.explr_camp_curriculum_links (
  explr_camp_id uuid not null references public.explr_camps(id) on delete cascade,
  camp_slug text not null references public.camps(slug) on delete cascade,
  linked_at timestamptz not null default now(),
  linked_by uuid references public.educators(id) on delete set null,
  primary key (explr_camp_id, camp_slug)
);

create index if not exists idx_explr_camp_curriculum_explr
  on public.explr_camp_curriculum_links(explr_camp_id);
create index if not exists idx_explr_camp_curriculum_slug
  on public.explr_camp_curriculum_links(camp_slug);

alter table public.explr_camp_curriculum_links enable row level security;

drop policy if exists "explr_camp_curriculum_links admin write" on public.explr_camp_curriculum_links;
create policy "explr_camp_curriculum_links admin write" on public.explr_camp_curriculum_links
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "explr_camp_curriculum_links read" on public.explr_camp_curriculum_links;
create policy "explr_camp_curriculum_links read" on public.explr_camp_curriculum_links
  for select using (true);

-- Backfill: existing single linked_camp_slug rows become a first row in the
-- new join table. Skip if the camp_slug doesn't actually exist in camps.
insert into public.explr_camp_curriculum_links (explr_camp_id, camp_slug)
select ec.id, ec.linked_camp_slug
from public.explr_camps ec
join public.camps c on c.slug = ec.linked_camp_slug
where ec.linked_camp_slug is not null
on conflict do nothing;

notify pgrst, 'reload schema';
