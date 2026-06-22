-- Family/student-facing browse of approved opportunities, internal
-- registration, and the internship age gate.
--
-- Internships require the student to be 14 by June 1 of the internship's year
-- (and in grade 8+). That needs a date of birth on the student, captured the
-- first time they open internships.

-- Denormalize the org's name + logo onto the opportunity so the PUBLIC browse
-- can show them without read access to the organizations table (which stays
-- staff-only because it holds contact info).
alter table public.opportunities
  add column if not exists org_name text,
  add column if not exists org_logo_url text;

-- Student date of birth → drives the internship age gate (14 by June 1).
alter table public.students
  add column if not exists date_of_birth date;

drop policy if exists "students self update" on public.students;
create policy "students self update" on public.students
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Internal registrations / expressions of interest for an opportunity.
create table if not exists public.opportunity_registrations (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  contact_name text,
  contact_email text,
  note text,
  created_at timestamptz not null default now(),
  unique (opportunity_id, student_id)
);
create index if not exists idx_opp_regs_opportunity
  on public.opportunity_registrations(opportunity_id);
alter table public.opportunity_registrations enable row level security;

-- A student registers + reads their own rows; the owning org reads
-- registrations for its opportunities; admins everything.
drop policy if exists "opp_regs self" on public.opportunity_registrations;
create policy "opp_regs self" on public.opportunity_registrations
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "opp_regs org read" on public.opportunity_registrations;
create policy "opp_regs org read" on public.opportunity_registrations
  for select using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and o.org_id = auth.uid()
    )
  );

drop policy if exists "opp_regs admin" on public.opportunity_registrations;
create policy "opp_regs admin" on public.opportunity_registrations
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

notify pgrst, 'reload schema';
