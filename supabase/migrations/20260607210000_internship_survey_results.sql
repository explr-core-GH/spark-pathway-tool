-- Internship Interest Survey results.
--
-- The survey at /assessment/internship-interest produces a RIASEC interest
-- profile + a ranked list of internship matches. One row per student, keyed by
-- the pseudonymous auth user id (no PII lives here). The existing
-- internship_interest_completions (gate) and internship_interest_responses
-- (apply-page ranking) tables are still written by the survey for back-compat;
-- this table holds the richer profile + match snapshot for the results screen
-- and staff roster data.

create table if not exists public.internship_survey_results (
  student_id   uuid primary key references auth.users (id) on delete cascade,
  responses    jsonb not null default '{}'::jsonb,
  riasec_raw   jsonb,
  riasec_norm  jsonb,
  holland_code text,
  sector_values jsonb,
  env_vector   jsonb,
  experience   jsonb,
  activity_tags text[] not null default '{}',
  matches      jsonb,
  completed_at timestamptz,
  updated_at   timestamptz not null default now()
);

alter table public.internship_survey_results enable row level security;

-- A student manages only their own row.
drop policy if exists "isr select own" on public.internship_survey_results;
create policy "isr select own" on public.internship_survey_results
  for select using (auth.uid() = student_id);

drop policy if exists "isr insert own" on public.internship_survey_results;
create policy "isr insert own" on public.internship_survey_results
  for insert with check (auth.uid() = student_id);

drop policy if exists "isr update own" on public.internship_survey_results;
create policy "isr update own" on public.internship_survey_results
  for update using (auth.uid() = student_id) with check (auth.uid() = student_id);

-- Staff can read (roster data / monitoring). Admins and educators only.
drop policy if exists "isr admin read" on public.internship_survey_results;
create policy "isr admin read" on public.internship_survey_results
  for select using (public.is_admin(auth.uid()));

drop policy if exists "isr educator read" on public.internship_survey_results;
create policy "isr educator read" on public.internship_survey_results
  for select using (public.is_educator(auth.uid()));

notify pgrst, 'reload schema';
