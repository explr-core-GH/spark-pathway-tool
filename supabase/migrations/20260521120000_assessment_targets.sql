-- Unified assessment assignment targeting.
--
-- One table for "who should take what". A target is either an educator
-- (the assignment cascades to their whole roster) or an individual
-- student (for kids not attached to an educator, or one-off /
-- individualized needs). Covers every assessment type — the RIASEC
-- interest assessment, the aptitude batteries, the internship-interest
-- survey, and the three STEM survey flows.
--
-- This supersedes the old loose public.assessment_assignments table
-- (which was shown globally to every student with no targeting). That
-- table is left in place untouched so existing dashboard code doesn't
-- break; new work should use assessment_targets.
--
-- public.survey_assignments stays — it's the camp↔survey link the survey
-- runner needs. A survey target here references a survey_assignments row
-- so the runner knows which survey + which camp.

create table if not exists public.assessment_targets (
  id uuid primary key default gen_random_uuid(),
  -- which assessment. 'survey' defers the specifics to survey_assignment_id.
  assessment_kind text not null check (assessment_kind in (
    'riasec',
    'internship_interest',
    'aptitude_ms',
    'aptitude_hs',
    'survey'
  )),
  -- set only when assessment_kind = 'survey'.
  survey_assignment_id uuid references public.survey_assignments(id) on delete cascade,
  -- 'educator' → cascades to that educator's roster; 'student' → just them.
  target_type text not null check (target_type in ('educator', 'student')),
  target_id uuid not null,
  assigned_by uuid,
  due_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_assessment_targets_target
  on public.assessment_targets(target_type, target_id);

alter table public.assessment_targets enable row level security;

-- Admins create/manage all assignment targets.
drop policy if exists "assessment_targets admin write" on public.assessment_targets;
create policy "assessment_targets admin write" on public.assessment_targets
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Educators read all (to see what's assigned across their programs).
drop policy if exists "assessment_targets educator read" on public.assessment_targets;
create policy "assessment_targets educator read" on public.assessment_targets
  for select using (public.is_educator(auth.uid()));

-- Students read all targets — the dashboard resolves which apply to them
-- client-side (direct student targets now; educator-cascade once camp
-- account generation links students to their educator). Targets carry no
-- sensitive data, so a blanket signed-in read is fine.
drop policy if exists "assessment_targets student read" on public.assessment_targets;
create policy "assessment_targets student read" on public.assessment_targets
  for select using (auth.uid() is not null);

-- Educators + admins need to read the students directory to target an
-- individual student from the assign UI. The base table is otherwise
-- self-read only.
drop policy if exists "students staff read" on public.students;
create policy "students staff read" on public.students
  for select using (
    public.is_educator(auth.uid()) or public.is_admin(auth.uid())
  );

notify pgrst, 'reload schema';
