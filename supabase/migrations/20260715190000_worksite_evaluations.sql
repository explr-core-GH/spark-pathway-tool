-- Worksite supervisor evaluations.
--
-- Internship worksite supervisors/instructors are educator accounts connected
-- to their internship via internship_educators (assigned by the admin from
-- the internship workspace). This migration lets them:
--   1. READ their internship's placed students (new placements policy), and
--   2. score each student on a basic job-skills rubric (1-5 per criterion)
--      with a "recommend for advanced opportunities" flag.
-- Rubric criteria live in code; scores are stored per criterion in jsonb.

create table if not exists public.internship_evaluations (
  id uuid primary key default gen_random_uuid(),
  internship_ref text not null,          -- catalog slug or 'opp:<id>'
  student_id uuid not null references public.students(id) on delete cascade,
  evaluator_id uuid not null,            -- educator (supervisor) id
  rubric jsonb not null default '{}'::jsonb,  -- { criterion_key: 1-5 }
  recommend boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (internship_ref, student_id, evaluator_id)
);
create index if not exists idx_internship_evals_ref
  on public.internship_evaluations(internship_ref);
create index if not exists idx_internship_evals_student
  on public.internship_evaluations(student_id);
alter table public.internship_evaluations enable row level security;

-- A supervisor manages THEIR OWN evaluation rows, only for internships
-- they're connected to.
drop policy if exists "evaluations evaluator all" on public.internship_evaluations;
create policy "evaluations evaluator all" on public.internship_evaluations
  for all using (
    evaluator_id = auth.uid()
    and exists (
      select 1 from public.internship_educators ie
      where ie.educator_id = auth.uid()
        and ie.internship_slug = internship_ref
    )
  ) with check (
    evaluator_id = auth.uid()
    and exists (
      select 1 from public.internship_educators ie
      where ie.educator_id = auth.uid()
        and ie.internship_slug = internship_ref
    )
  );

drop policy if exists "evaluations staff read" on public.internship_evaluations;
create policy "evaluations staff read" on public.internship_evaluations
  for select using (public.is_educator(auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "evaluations admin all" on public.internship_evaluations;
create policy "evaluations admin all" on public.internship_evaluations
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Supervisors can read the placements (rosters) of internships they're
-- connected to — previously admin-only (+ student self-read).
drop policy if exists "placements supervisor read" on public.internship_placements;
create policy "placements supervisor read" on public.internship_placements
  for select using (
    exists (
      select 1 from public.internship_educators ie
      where ie.educator_id = auth.uid()
        and ie.internship_slug = approved_internship_id
    )
  );

notify pgrst, 'reload schema';
