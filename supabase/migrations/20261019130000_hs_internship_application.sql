-- High school internship application redesign
-- (docs/internship-application-spec.md).
--
-- One general application per student per season (core + interest survey +
-- general-track choices), completed FIRST. After that a student applies to a
-- partner internship by answering only that partner's questions and site
-- requirements. Partners build those questions with the application builder;
-- each publish freezes a version, locked once any student starts it.
--
-- Partners never see applications. Only EXPLR admins do. Partners see who
-- was placed with them through org_placed_students().
--
-- Additive only: legacy internship_selections / internship_applications rows
-- are untouched and still readable by staff.

-- ── seasons ──────────────────────────────────────────────────────────────
create table if not exists public.application_seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  program_start date,
  program_end date,
  opens_at date,
  closes_at date,
  retention_days int not null default 365,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists application_seasons_one_current
  on public.application_seasons (is_current) where is_current;
alter table public.application_seasons enable row level security;
drop policy if exists "seasons read" on public.application_seasons;
create policy "seasons read" on public.application_seasons for select using (true);
drop policy if exists "seasons admin write" on public.application_seasons;
create policy "seasons admin write" on public.application_seasons
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
grant select on public.application_seasons to anon, authenticated;
grant insert, update, delete on public.application_seasons to authenticated;

insert into public.application_seasons (name, program_start, program_end, opens_at, closes_at, is_current)
select 'Summer 2027', '2027-06-14', '2027-08-06', '2026-11-01', '2027-04-15', true
where not exists (select 1 from public.application_seasons);

-- ── general application ──────────────────────────────────────────────────
create table if not exists public.hs_general_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  season_id uuid not null references public.application_seasons(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','received','under_review','missing','placed','waitlisted','not_placed')),
  step int not null default 0,
  core jsonb not null default '{}'::jsonb,
  extras jsonb not null default '{}'::jsonb,
  choices jsonb not null default '{}'::jsonb,
  assessment_session_id uuid references public.assessment_sessions(session_id) on delete set null,
  pseudo_id text,
  submitted_at timestamptz,
  placed_opportunity_id uuid references public.opportunities(id) on delete set null,
  staff_notes text,
  missing_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, season_id)
);
create index if not exists hs_general_status on public.hs_general_applications(season_id, status);

drop trigger if exists hs_general_set_updated_at on public.hs_general_applications;
create trigger hs_general_set_updated_at
  before update on public.hs_general_applications
  for each row execute function public.set_updated_at();

-- Students may only move draft → received, and can't edit after submitting.
create or replace function public.hs_general_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.pseudo_id := coalesce(new.pseudo_id, substr(md5('explr-pseudo:' || new.student_id::text), 1, 16));
    if not public.is_admin(auth.uid()) then
      new.status := 'draft';
      new.staff_notes := null;
      new.missing_note := null;
      new.placed_opportunity_id := null;
    end if;
    return new;
  end if;
  if public.is_admin(auth.uid()) or auth.uid() is null then
    return new;
  end if;
  if old.status <> 'draft' then
    raise exception 'This application was already submitted.';
  end if;
  if new.status not in ('draft','received') then
    raise exception 'Only EXPLR staff can change an application''s status.';
  end if;
  if new.status = 'received' then new.submitted_at := now(); end if;
  new.staff_notes := old.staff_notes;
  new.missing_note := old.missing_note;
  new.placed_opportunity_id := old.placed_opportunity_id;
  new.pseudo_id := old.pseudo_id;
  return new;
end $$;
drop trigger if exists hs_general_guard on public.hs_general_applications;
create trigger hs_general_guard
  before insert or update on public.hs_general_applications
  for each row execute function public.hs_general_guard();

alter table public.hs_general_applications enable row level security;
drop policy if exists "hs_general self" on public.hs_general_applications;
create policy "hs_general self" on public.hs_general_applications
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "hs_general admin" on public.hs_general_applications;
create policy "hs_general admin" on public.hs_general_applications
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
grant select, insert, update on public.hs_general_applications to authenticated;
grant delete on public.hs_general_applications to authenticated;

-- Optional demographics, kept apart for funder reporting only.
create table if not exists public.hs_demographics (
  application_id uuid primary key references public.hs_general_applications(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.hs_demographics enable row level security;
drop policy if exists "hs_demo self" on public.hs_demographics;
create policy "hs_demo self" on public.hs_demographics
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "hs_demo admin read" on public.hs_demographics;
create policy "hs_demo admin read" on public.hs_demographics
  for select using (public.is_admin(auth.uid()));
grant select, insert, update, delete on public.hs_demographics to authenticated;

-- ── partner application builder + versions ───────────────────────────────
alter table public.opportunities add column if not exists application_builder jsonb;
create table if not exists public.opp_application_versions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  version int not null,
  builder jsonb not null,
  published_by uuid,
  published_at timestamptz not null default now(),
  locked_at timestamptz,
  unique (opportunity_id, version)
);
alter table public.opportunities
  add column if not exists application_version_id uuid
  references public.opp_application_versions(id) on delete set null;

alter table public.opp_application_versions enable row level security;
drop policy if exists "versions owner" on public.opp_application_versions;
create policy "versions owner" on public.opp_application_versions
  for select using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.org_id = auth.uid()));
drop policy if exists "versions owner insert" on public.opp_application_versions;
create policy "versions owner insert" on public.opp_application_versions
  for insert with check (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.org_id = auth.uid()));
drop policy if exists "versions public read" on public.opp_application_versions;
create policy "versions public read" on public.opp_application_versions
  for select using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.status = 'approved'));
drop policy if exists "versions admin" on public.opp_application_versions;
create policy "versions admin" on public.opp_application_versions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
grant select, insert on public.opp_application_versions to authenticated;
grant select on public.opp_application_versions to anon;

-- ── a student's answers to one partner application ───────────────────────
create table if not exists public.hs_partner_applications (
  id uuid primary key default gen_random_uuid(),
  general_id uuid not null references public.hs_general_applications(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  version_id uuid references public.opp_application_versions(id) on delete set null,
  answers jsonb not null default '{}'::jsonb,
  requirements jsonb not null default '{}'::jsonb,
  question_notes jsonb not null default '{}'::jsonb,
  cleared_help text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','submitted','withdrawn')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (general_id, opportunity_id)
);
drop trigger if exists hs_partner_set_updated_at on public.hs_partner_applications;
create trigger hs_partner_set_updated_at
  before update on public.hs_partner_applications
  for each row execute function public.set_updated_at();

-- Lock the version a student starts; keep staff-only fields staff-only.
create or replace function public.hs_partner_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.version_id is not null then
    update public.opp_application_versions set locked_at = coalesce(locked_at, now())
      where id = new.version_id;
  end if;
  if public.is_admin(auth.uid()) or auth.uid() is null then return new; end if;
  if not exists (
    select 1 from public.hs_general_applications g
    where g.id = new.general_id and g.student_id = auth.uid() and g.status <> 'draft'
  ) then
    raise exception 'Finish and submit your general application first.';
  end if;
  if tg_op = 'INSERT' then
    new.cleared_help := '{}';
  else
    new.cleared_help := old.cleared_help;
    if old.status = 'submitted' and new.status = 'submitted' and new.answers is distinct from old.answers then
      raise exception 'This application was already submitted.';
    end if;
  end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
    new.submitted_at := now();
  end if;
  return new;
end $$;
drop trigger if exists hs_partner_guard on public.hs_partner_applications;
create trigger hs_partner_guard
  before insert or update on public.hs_partner_applications
  for each row execute function public.hs_partner_guard();

alter table public.hs_partner_applications enable row level security;
drop policy if exists "hs_partner self" on public.hs_partner_applications;
create policy "hs_partner self" on public.hs_partner_applications
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "hs_partner admin" on public.hs_partner_applications;
create policy "hs_partner admin" on public.hs_partner_applications
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
grant select, insert, update, delete on public.hs_partner_applications to authenticated;

-- ── status history (drives student + guardian notifications) ─────────────
create table if not exists public.application_status_events (
  id uuid primary key default gen_random_uuid(),
  general_id uuid not null references public.hs_general_applications(id) on delete cascade,
  status text not null,
  note text,
  created_by uuid,
  delivery jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.application_status_events enable row level security;
drop policy if exists "status events self read" on public.application_status_events;
create policy "status events self read" on public.application_status_events
  for select using (exists (select 1 from public.hs_general_applications g where g.id = general_id and g.student_id = auth.uid()));
drop policy if exists "status events admin" on public.application_status_events;
create policy "status events admin" on public.application_status_events
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
grant select, insert on public.application_status_events to authenticated;

-- ── placements from the new flow ─────────────────────────────────────────
alter table public.internship_placements alter column application_id drop not null;
alter table public.internship_placements
  add column if not exists hs_general_id uuid references public.hs_general_applications(id) on delete cascade;

-- Partners no longer see applicants' picks or proofs.
drop policy if exists "selections org read" on public.internship_selections;

-- What a partner sees: students placed with them, nothing else.
create or replace function public.org_placed_students()
returns table (
  placement_id uuid,
  student_name text,
  internship_name text,
  opportunity_id uuid,
  start_date date,
  placed_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id,
         trim(coalesce(nullif(g.core->>'preferredName',''), g.core->>'legalFirst', s.first_name) || ' ' || coalesce(g.core->>'legalLast','')),
         o.name,
         o.id,
         o.start_date,
         p.approved_at
  from public.internship_placements p
  join public.opportunities o on 'opp:' || o.id::text = p.approved_internship_id
  left join public.hs_general_applications g on g.id = p.hs_general_id
  left join public.students s on s.id = p.student_id
  where o.org_id = auth.uid()
  order by p.approved_at desc
$$;
grant execute on function public.org_placed_students() to authenticated;

-- Retention: delete unplaced applications once a season's retention runs out.
create or replace function public.purge_unplaced_applications()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin(auth.uid()) and auth.uid() is not null then
    raise exception 'Admin access required';
  end if;
  delete from public.hs_general_applications g
  using public.application_seasons s
  where s.id = g.season_id
    and g.status <> 'placed'
    and s.program_end is not null
    and s.program_end + s.retention_days < current_date;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.purge_unplaced_applications() to authenticated;

notify pgrst, 'reload schema';
