-- EXPLR STEM assessment survey battery.
--
-- Three research-based survey flows (S-STEM, Friday Institute 2012 + career
-- decision self-efficacy items) for pre/post evaluation of EXPLR camps and
-- internships. Items + scoring rules live in src/lib/explr-stem/items.json;
-- this migration is just the storage + an aggregate view.
--
-- Model: an admin creates a survey_assignment tied to a camp or internship.
-- Students take it; one survey_responses row per (student, assignment), with
-- item-level rows underneath. Raw response values are stored as given —
-- reverse-coding is applied only at scoring time, never on write, so the
-- data stays re-analyzable.

-- ── survey_assignments ─────────────────────────────────────────────────────
create table if not exists public.survey_assignments (
  id uuid primary key default gen_random_uuid(),
  survey_type text not null
    check (survey_type in ('retrospective', 'middle_school', 'high_school')),
  administration text not null
    check (administration in ('pre', 'post', 'retrospective')),
  unit_type text not null check (unit_type in ('camp', 'internship')),
  -- camp slug, internship slug, or an explr_camps id (as text) — admin's pick.
  unit_ref text not null,
  title text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  opens_at timestamptz,
  closes_at timestamptz
);

alter table public.survey_assignments enable row level security;

drop policy if exists "survey_assignments admin write" on public.survey_assignments;
create policy "survey_assignments admin write" on public.survey_assignments
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Any signed-in user can read assignments (students need to see what to take).
drop policy if exists "survey_assignments read" on public.survey_assignments;
create policy "survey_assignments read" on public.survey_assignments
  for select using (auth.uid() is not null);

-- ── survey_responses ───────────────────────────────────────────────────────
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null
    references public.survey_assignments(id) on delete cascade,
  student_id uuid not null,
  survey_type text not null,
  administration text not null,
  -- new demographic answers (grade/program prefilled elsewhere) as jsonb.
  demographics jsonb,
  device_type text,
  -- which screen the student last advanced past — lets a refresh resume
  -- where they left off (0 = demographics screen).
  progress_index integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  -- one attempt per student per assignment.
  unique (assignment_id, student_id)
);

create index if not exists idx_survey_responses_assignment
  on public.survey_responses(assignment_id);
create index if not exists idx_survey_responses_student
  on public.survey_responses(student_id);

alter table public.survey_responses enable row level security;

-- Students fully manage their own response rows.
drop policy if exists "survey_responses self" on public.survey_responses;
create policy "survey_responses self" on public.survey_responses
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Educators + admins read all (for the results dashboard).
drop policy if exists "survey_responses staff read" on public.survey_responses;
create policy "survey_responses staff read" on public.survey_responses
  for select using (
    public.is_educator(auth.uid()) or public.is_admin(auth.uid())
  );

-- ── survey_item_responses ──────────────────────────────────────────────────
create table if not exists public.survey_item_responses (
  id uuid primary key default gen_random_uuid(),
  survey_response_id uuid not null
    references public.survey_responses(id) on delete cascade,
  item_id text not null,            -- matches an id in items.json
  value_now integer,                -- 1-5 or 1-4; raw, never reverse-coded
  value_then integer,               -- retrospective surveys only
  skipped boolean not null default false,
  unique (survey_response_id, item_id)
);

create index if not exists idx_survey_item_responses_parent
  on public.survey_item_responses(survey_response_id);

alter table public.survey_item_responses enable row level security;

-- Item rows inherit access from their parent survey_responses row.
drop policy if exists "survey_item_responses self" on public.survey_item_responses;
create policy "survey_item_responses self" on public.survey_item_responses
  for all using (
    exists (
      select 1 from public.survey_responses sr
      where sr.id = survey_response_id and sr.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.survey_responses sr
      where sr.id = survey_response_id and sr.student_id = auth.uid()
    )
  );

drop policy if exists "survey_item_responses staff read" on public.survey_item_responses;
create policy "survey_item_responses staff read" on public.survey_item_responses
  for select using (
    public.is_educator(auth.uid()) or public.is_admin(auth.uid())
  );

-- ── survey_open_responses ──────────────────────────────────────────────────
create table if not exists public.survey_open_responses (
  id uuid primary key default gen_random_uuid(),
  survey_response_id uuid not null
    references public.survey_responses(id) on delete cascade,
  prompt text not null,
  response text
);

create index if not exists idx_survey_open_responses_parent
  on public.survey_open_responses(survey_response_id);

alter table public.survey_open_responses enable row level security;

drop policy if exists "survey_open_responses self" on public.survey_open_responses;
create policy "survey_open_responses self" on public.survey_open_responses
  for all using (
    exists (
      select 1 from public.survey_responses sr
      where sr.id = survey_response_id and sr.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.survey_responses sr
      where sr.id = survey_response_id and sr.student_id = auth.uid()
    )
  );

drop policy if exists "survey_open_responses staff read" on public.survey_open_responses;
create policy "survey_open_responses staff read" on public.survey_open_responses
  for select using (
    public.is_educator(auth.uid()) or public.is_admin(auth.uid())
  );

-- ── survey_scale_scores view ───────────────────────────────────────────────
-- Construct means per survey_response, reverse-coding applied inline. The
-- four negatively-worded items (math_1/3/5, science_8) become 6 - value.
-- `*_now_mean` uses value_now; `*_then_mean` uses value_then (populated only
-- for retrospective surveys, where 'then' is the pre score). Skipped items
-- are excluded. This view is a convenience for ad-hoc queries + CSV; the
-- app's authoritative scoring (with the <50%-answered → null rule) is the
-- TypeScript scoreConstruct() in src/lib/explr-stem/scoring.ts.
create or replace view public.survey_scale_scores as
select
  sr.id as survey_response_id,
  sr.assignment_id,
  sr.student_id,
  sr.survey_type,
  sr.administration,
  sr.completed_at,
  avg(case when ir.item_id like 'math_%' and not ir.skipped
    then (case when ir.item_id in ('math_1','math_3','math_5')
               then 6 - ir.value_now else ir.value_now end)
  end) as math_now_mean,
  avg(case when ir.item_id like 'science_%' and not ir.skipped
    then (case when ir.item_id = 'science_8'
               then 6 - ir.value_now else ir.value_now end)
  end) as science_now_mean,
  avg(case when ir.item_id like 'engtech_%' and not ir.skipped
    then ir.value_now end) as engtech_now_mean,
  avg(case when ir.item_id like 'c21_%' and not ir.skipped
    then ir.value_now end) as c21_now_mean,
  avg(case when ir.item_id like 'career_%' and not ir.skipped
       and ir.item_id not like 'career_planning_%'
    then ir.value_now end) as career_interest_now_mean,
  avg(case when ir.item_id like 'career_planning_%' and not ir.skipped
    then ir.value_now end) as career_planning_now_mean,
  avg(case when ir.item_id like 'wbl_%' and not ir.skipped
    then ir.value_now end) as wbl_now_mean,
  avg(case when ir.item_id like 'math_%' and not ir.skipped
       and ir.value_then is not null
    then (case when ir.item_id in ('math_1','math_3','math_5')
               then 6 - ir.value_then else ir.value_then end)
  end) as math_then_mean,
  avg(case when ir.item_id like 'science_%' and not ir.skipped
       and ir.value_then is not null
    then (case when ir.item_id = 'science_8'
               then 6 - ir.value_then else ir.value_then end)
  end) as science_then_mean,
  avg(case when ir.item_id like 'engtech_%' and not ir.skipped
       and ir.value_then is not null then ir.value_then end) as engtech_then_mean,
  avg(case when ir.item_id like 'c21_%' and not ir.skipped
       and ir.value_then is not null then ir.value_then end) as c21_then_mean,
  avg(case when ir.item_id like 'career_%' and not ir.skipped
       and ir.item_id not like 'career_planning_%'
       and ir.value_then is not null then ir.value_then end)
    as career_interest_then_mean
from public.survey_responses sr
left join public.survey_item_responses ir on ir.survey_response_id = sr.id
group by sr.id;

notify pgrst, 'reload schema';
