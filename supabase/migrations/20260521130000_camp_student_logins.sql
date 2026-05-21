-- Camp-student account generation.
--
-- Camp kids (grades ~5-8) don't have email, so EXPLR generates an account
-- per ExplrMore registration: a throwaway username + a simple password an
-- educator prints and hands out. Two tables:
--
--   student_camp_links   — ties a generated student account to the camp
--                          session it came from. This is the bridge that
--                          lets an educator-targeted assessment_targets
--                          row cascade to the right students (student →
--                          camp → explr_camp_educators → educator).
--
--   camp_student_logins  — the generated credentials, kept so an educator
--                          can re-print the class sheet. The password is
--                          stored in plaintext on purpose: these are
--                          low-stakes minor accounts with no email, and
--                          the educator must be able to read them back.
--                          RLS keeps the table to educators + admins only.

create table if not exists public.student_camp_links (
  student_id uuid not null references public.students(id) on delete cascade,
  explr_camp_id uuid not null references public.explr_camps(id) on delete cascade,
  linked_at timestamptz not null default now(),
  primary key (student_id, explr_camp_id)
);

create index if not exists idx_student_camp_links_camp
  on public.student_camp_links(explr_camp_id);
create index if not exists idx_student_camp_links_student
  on public.student_camp_links(student_id);

alter table public.student_camp_links enable row level security;

drop policy if exists "student_camp_links staff read" on public.student_camp_links;
create policy "student_camp_links staff read" on public.student_camp_links
  for select using (
    public.is_educator(auth.uid()) or public.is_admin(auth.uid())
  );

-- Students can see their own camp links (the dashboard resolves
-- educator-cascaded assignments through this).
drop policy if exists "student_camp_links self read" on public.student_camp_links;
create policy "student_camp_links self read" on public.student_camp_links
  for select using (student_id = auth.uid());

drop policy if exists "student_camp_links admin write" on public.student_camp_links;
create policy "student_camp_links admin write" on public.student_camp_links
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create table if not exists public.camp_student_logins (
  id uuid primary key default gen_random_uuid(),
  explr_camp_id uuid references public.explr_camps(id) on delete cascade,
  -- one login per ExplrMore registration — the unique key prevents
  -- double-generating on a re-run.
  explr_registration_id uuid unique
    references public.explr_registrations(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  child_name text not null,
  username text not null,
  password_plain text not null,
  generated_at timestamptz not null default now(),
  generated_by uuid
);

create index if not exists idx_camp_student_logins_camp
  on public.camp_student_logins(explr_camp_id);

alter table public.camp_student_logins enable row level security;

-- Educators + admins can read the credentials sheet (educators print and
-- hand it out). Only admins (and the service-role generator) write.
drop policy if exists "camp_student_logins staff read" on public.camp_student_logins;
create policy "camp_student_logins staff read" on public.camp_student_logins
  for select using (
    public.is_educator(auth.uid()) or public.is_admin(auth.uid())
  );

drop policy if exists "camp_student_logins admin write" on public.camp_student_logins;
create policy "camp_student_logins admin write" on public.camp_student_logins
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

notify pgrst, 'reload schema';
