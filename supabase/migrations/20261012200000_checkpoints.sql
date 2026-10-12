-- Passport redesign, phase 3b: advising checkpoints.
-- Follows docs/ohio-career-advising-alignment.md: two checkpoints per grade
-- per school year (fall, spring), each a set of tasks; a career goal per
-- checkpoint; Ohio's 15-item planning checklist; an annual plan approval.

create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_year text not null,                 -- e.g. '2026-27'
  term text not null check (term in ('fall','spring')),
  grade int not null check (grade between 4 and 12),
  status text not null default 'open' check (status in ('open','submitted','reviewed')),
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  advisor_notes text,
  created_at timestamptz not null default now(),
  unique (student_id, school_year, term)
);
create index if not exists idx_checkpoints_student on public.checkpoints(student_id);

create table if not exists public.checkpoint_tasks (
  id uuid primary key default gen_random_uuid(),
  checkpoint_id uuid not null references public.checkpoints(id) on delete cascade,
  task_key text not null,
  required boolean not null default true,
  status text not null default 'todo' check (status in ('todo','done','waived')),
  completed_at timestamptz,
  waived_by uuid,
  waived_reason text,
  payload jsonb,
  updated_at timestamptz not null default now(),
  unique (checkpoint_id, task_key)
);
create index if not exists idx_checkpoint_tasks_checkpoint on public.checkpoint_tasks(checkpoint_id);

drop trigger if exists checkpoint_tasks_set_updated_at on public.checkpoint_tasks;
create trigger checkpoint_tasks_set_updated_at
  before update on public.checkpoint_tasks
  for each row execute function public.set_updated_at();

create table if not exists public.career_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  checkpoint_id uuid references public.checkpoints(id) on delete set null,
  grade int,
  primary_goal text not null,
  secondary_goal text,
  cluster text,
  post_hs_plan text check (post_hs_plan in ('four_year','two_year','credential','apprenticeship','military','work','undecided')),
  changed_since_last boolean,
  why text,
  created_at timestamptz not null default now()
);
create index if not exists idx_career_goals_student on public.career_goals(student_id);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_year text not null,
  item_no int not null check (item_no between 1 and 15),
  checked_at timestamptz,
  comment text,
  auto boolean not null default false,
  unique (student_id, school_year, item_no)
);

create table if not exists public.plan_approvals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_year text not null,
  student_ack_at timestamptz,
  guardian_ack_at timestamptz,
  advisor_ack_at timestamptz,
  advisor_id uuid,
  method text,
  unique (student_id, school_year)
);

-- RLS: students own their plan; staff who can reach the student read it and
-- (for checkpoints) annotate and review; admins everything.
alter table public.checkpoints enable row level security;
alter table public.checkpoint_tasks enable row level security;
alter table public.career_goals enable row level security;
alter table public.checklist_items enable row level security;
alter table public.plan_approvals enable row level security;

create or replace function public.staff_can_see_student(_uid uuid, _student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin(_uid)
      or (public.is_educator(_uid) and (
            public.educator_can_access_student(_uid, _student_id)
            or exists (
              select 1 from public.class_students cs join public.classes c on c.id = cs.class_id
              where cs.student_id = _student_id and c.educator_id = _uid
            )
         ));
$$;
revoke all on function public.staff_can_see_student(uuid, uuid) from public;
grant execute on function public.staff_can_see_student(uuid, uuid) to authenticated;

-- checkpoints
drop policy if exists "checkpoints self" on public.checkpoints;
create policy "checkpoints self" on public.checkpoints
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid() and reviewed_at is null and reviewed_by is null);
drop policy if exists "checkpoints staff read" on public.checkpoints;
create policy "checkpoints staff read" on public.checkpoints
  for select using (public.staff_can_see_student(auth.uid(), student_id));
drop policy if exists "checkpoints staff review" on public.checkpoints;
create policy "checkpoints staff review" on public.checkpoints
  for update using (public.staff_can_see_student(auth.uid(), student_id))
  with check (public.staff_can_see_student(auth.uid(), student_id));

-- tasks
drop policy if exists "checkpoint_tasks self" on public.checkpoint_tasks;
create policy "checkpoint_tasks self" on public.checkpoint_tasks
  for all using (exists (select 1 from public.checkpoints c where c.id = checkpoint_id and c.student_id = auth.uid()))
  with check (exists (select 1 from public.checkpoints c where c.id = checkpoint_id and c.student_id = auth.uid()) and status <> 'waived');
drop policy if exists "checkpoint_tasks staff" on public.checkpoint_tasks;
create policy "checkpoint_tasks staff" on public.checkpoint_tasks
  for all using (exists (select 1 from public.checkpoints c where c.id = checkpoint_id and public.staff_can_see_student(auth.uid(), c.student_id)))
  with check (exists (select 1 from public.checkpoints c where c.id = checkpoint_id and public.staff_can_see_student(auth.uid(), c.student_id)));

-- goals, checklist, approvals
drop policy if exists "career_goals self" on public.career_goals;
create policy "career_goals self" on public.career_goals
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "career_goals staff read" on public.career_goals;
create policy "career_goals staff read" on public.career_goals
  for select using (public.staff_can_see_student(auth.uid(), student_id));

drop policy if exists "checklist_items self" on public.checklist_items;
create policy "checklist_items self" on public.checklist_items
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "checklist_items staff read" on public.checklist_items;
create policy "checklist_items staff read" on public.checklist_items
  for select using (public.staff_can_see_student(auth.uid(), student_id));

drop policy if exists "plan_approvals self" on public.plan_approvals;
create policy "plan_approvals self" on public.plan_approvals
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid() and advisor_ack_at is null and advisor_id is null);
drop policy if exists "plan_approvals staff" on public.plan_approvals;
create policy "plan_approvals staff" on public.plan_approvals
  for all using (public.staff_can_see_student(auth.uid(), student_id))
  with check (public.staff_can_see_student(auth.uid(), student_id));

notify pgrst, 'reload schema';
