-- ============ schema.sql ============
create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  grade integer not null check (grade between 5 and 12),
  grade_band text generated always as (case when grade >= 9 then 'hs' else 'ms' end) stored,
  created_at timestamptz not null default now(),
  scheduled_deletion_at timestamptz default (now() + interval '24 months')
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  module_id text not null,
  item_id text not null,
  value_numeric integer check (value_numeric between 1 and 5),
  presentation_format_used text default 'text',
  completed_at timestamptz not null default now(),
  unique (student_id, item_id)
);
create index if not exists responses_student_idx on public.responses(student_id);
create index if not exists responses_module_idx on public.responses(student_id, module_id);

create table if not exists public.module_progress (
  student_id uuid not null references public.students(id) on delete cascade,
  module_id text not null,
  status text not null default 'in_progress' check (status in ('not_started','in_progress','complete')),
  started_at timestamptz default now(),
  completed_at timestamptz,
  primary key (student_id, module_id)
);

create table if not exists public.assessment_sessions (
  session_id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  form_version text not null check (form_version in ('MS','HS')),
  grade_at_session smallint not null check (grade_at_session between 5 and 12),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  item_sequence jsonb not null,
  current_index integer not null default 0,
  items_answered integer not null default 0,
  flag_inattentive boolean default false,
  flag_speeding boolean default false,
  flag_uniform boolean default false,
  scale_scores jsonb,
  holland_code varchar(3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sessions_student on public.assessment_sessions(student_id);
create index if not exists idx_sessions_completed on public.assessment_sessions(completed_at) where completed_at is not null;

create table if not exists public.assessment_responses (
  response_id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.assessment_sessions(session_id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  item_id varchar(32) not null,
  response_value jsonb not null,
  response_time_ms integer not null,
  is_practice boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, item_id)
);
create index if not exists idx_resp_session on public.assessment_responses(session_id);
create index if not exists idx_resp_student on public.assessment_responses(student_id);

create or replace function public.advance_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.assessment_sessions
  set items_answered = items_answered + 1, current_index = current_index + 1, updated_at = now()
  where session_id = p_session_id;
end;
$$;

create table if not exists public.internship_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  selected_internship_ids text[] not null,
  responses jsonb not null,
  riasec_snapshot jsonb,
  submission_term text not null default '2026-summer',
  status text not null default 'submitted'
    check (status in ('submitted', 'reviewing', 'approved', 'declined', 'withdrawn')),
  staff_notes text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (student_id, submission_term)
);
create index if not exists idx_app_student on public.internship_applications(student_id);
create index if not exists idx_app_term on public.internship_applications(submission_term);
create index if not exists idx_app_status on public.internship_applications(status);

create table if not exists public.internship_placements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.internship_applications(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  approved_internship_id text not null,
  approved_by uuid references public.students(id),
  approved_at timestamptz not null default now(),
  staff_notes text
);
create index if not exists idx_placement_app on public.internship_placements(application_id);
create index if not exists idx_placement_student on public.internship_placements(student_id);

alter table public.students enable row level security;
alter table public.responses enable row level security;
alter table public.module_progress enable row level security;
alter table public.assessment_sessions enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.internship_applications enable row level security;
alter table public.internship_placements enable row level security;

drop policy if exists "students self read" on public.students;
create policy "students self read" on public.students for select using (auth.uid() = id);
drop policy if exists "students self insert" on public.students;
create policy "students self insert" on public.students for insert with check (auth.uid() = id);
drop policy if exists "students self update" on public.students;
create policy "students self update" on public.students for update using (auth.uid() = id);

drop policy if exists "responses self all" on public.responses;
create policy "responses self all" on public.responses for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
drop policy if exists "module_progress self all" on public.module_progress;
create policy "module_progress self all" on public.module_progress for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
drop policy if exists "sessions self all" on public.assessment_sessions;
create policy "sessions self all" on public.assessment_sessions for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
drop policy if exists "session_responses self all" on public.assessment_responses;
create policy "session_responses self all" on public.assessment_responses for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
drop policy if exists "applications self all" on public.internship_applications;
create policy "applications self all" on public.internship_applications for all using (auth.uid() = student_id) with check (auth.uid() = student_id);
drop policy if exists "placements self read" on public.internship_placements;
create policy "placements self read" on public.internship_placements for select using (auth.uid() = student_id);

-- ============ educator-schema.sql ============
do $$ begin
  if not exists (select 1 from pg_type where typname = 'program_type') then
    create type program_type as enum ('stem','cs','robotics_fll','robotics_ftc','robotics_frc','camp','internship');
  end if;
end$$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'educator_role') then
    create type educator_role as enum ('educator', 'admin');
  end if;
end$$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'assessment_kind') then
    create type assessment_kind as enum ('interest_ms','interest_hs','aptitude_ms','aptitude_hs','internships');
  end if;
end$$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'roster_unit_type') then
    create type roster_unit_type as enum ('camp', 'internship');
  end if;
end$$;

create table if not exists public.educators (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  organization text,
  program_type program_type not null,
  role educator_role not null default 'educator',
  approved boolean not null default false,
  school_irn text,
  school_name text,
  created_at timestamptz not null default now()
);
create index if not exists idx_educators_school_irn on public.educators(school_irn);
create index if not exists idx_educators_program_type on public.educators(program_type);
create index if not exists idx_educators_role on public.educators(role);

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  program_type program_type not null,
  grade_band text,
  description text,
  created_by uuid references public.educators(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_programs_type on public.programs(program_type);
create index if not exists idx_programs_created_by on public.programs(created_by);

create table if not exists public.program_educators (
  program_id uuid not null references public.programs(id) on delete cascade,
  educator_id uuid not null references public.educators(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (program_id, educator_id)
);

create table if not exists public.educator_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  program_type program_type not null,
  organization text,
  token text not null unique,
  invited_by uuid references public.educators(id) on delete set null,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.educators(id) on delete set null
);
create index if not exists idx_invites_token on public.educator_invites(token);
create index if not exists idx_invites_email on public.educator_invites(email);

create table if not exists public.curriculum_tags (
  camp_slug text not null,
  program_type program_type not null,
  tagged_by uuid references public.educators(id) on delete set null,
  tagged_at timestamptz not null default now(),
  primary key (camp_slug, program_type)
);
create index if not exists idx_curr_tags_program on public.curriculum_tags(program_type);

create table if not exists public.internship_tags (
  internship_slug text not null,
  program_type program_type not null,
  tagged_by uuid references public.educators(id) on delete set null,
  tagged_at timestamptz not null default now(),
  primary key (internship_slug, program_type)
);
create index if not exists idx_int_tags_program on public.internship_tags(program_type);

create table if not exists public.assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete cascade,
  program_type program_type,
  assessment_kind assessment_kind not null,
  assigned_by uuid references public.educators(id) on delete set null,
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  notes text,
  check (program_id is not null or program_type is not null)
);
create index if not exists idx_assign_program on public.assessment_assignments(program_id);
create index if not exists idx_assign_type on public.assessment_assignments(program_type);

create table if not exists public.unit_rosters (
  unit_type roster_unit_type not null,
  unit_slug text not null,
  students jsonb not null default '[]'::jsonb,
  updated_by uuid references public.educators(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (unit_type, unit_slug)
);

-- Security-definer helpers to avoid recursive RLS on educators table
create or replace function public.is_educator(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.educators where id = uid);
$$;

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.educators where id = uid and role = 'admin');
$$;

alter table public.educators enable row level security;
alter table public.programs enable row level security;
alter table public.program_educators enable row level security;
alter table public.educator_invites enable row level security;
alter table public.assessment_assignments enable row level security;
alter table public.curriculum_tags enable row level security;
alter table public.internship_tags enable row level security;
alter table public.unit_rosters enable row level security;

drop policy if exists "educators self read" on public.educators;
create policy "educators self read" on public.educators for select using (auth.uid() = id or public.is_admin(auth.uid()));
drop policy if exists "educators self insert" on public.educators;
create policy "educators self insert" on public.educators for insert with check (auth.uid() = id);
drop policy if exists "educators self update" on public.educators;
create policy "educators self update" on public.educators for update using (auth.uid() = id);
drop policy if exists "educators admin update" on public.educators;
create policy "educators admin update" on public.educators for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "programs read all educators" on public.programs;
create policy "programs read all educators" on public.programs for select using (public.is_educator(auth.uid()));
drop policy if exists "programs admin write" on public.programs;
create policy "programs admin write" on public.programs for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "program_educators self read" on public.program_educators;
create policy "program_educators self read" on public.program_educators for select using (educator_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists "program_educators admin write" on public.program_educators;
create policy "program_educators admin write" on public.program_educators for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "invites admin write" on public.educator_invites;
create policy "invites admin write" on public.educator_invites for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "invites read by anyone" on public.educator_invites;
create policy "invites read by anyone" on public.educator_invites for select using (true);

drop policy if exists "assignments educator read" on public.assessment_assignments;
create policy "assignments educator read" on public.assessment_assignments for select using (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.educators e
    where e.id = auth.uid()
      and (e.program_type = assessment_assignments.program_type
        or exists (select 1 from public.program_educators pe where pe.educator_id = e.id and pe.program_id = assessment_assignments.program_id))
  )
);
drop policy if exists "assignments admin write" on public.assessment_assignments;
create policy "assignments admin write" on public.assessment_assignments for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "curriculum_tags read all educators" on public.curriculum_tags;
create policy "curriculum_tags read all educators" on public.curriculum_tags for select using (public.is_educator(auth.uid()));
drop policy if exists "curriculum_tags admin write" on public.curriculum_tags;
create policy "curriculum_tags admin write" on public.curriculum_tags for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "internship_tags read all educators" on public.internship_tags;
create policy "internship_tags read all educators" on public.internship_tags for select using (public.is_educator(auth.uid()));
drop policy if exists "internship_tags admin write" on public.internship_tags;
create policy "internship_tags admin write" on public.internship_tags for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "unit_rosters read all educators" on public.unit_rosters;
create policy "unit_rosters read all educators" on public.unit_rosters for select using (public.is_educator(auth.uid()));
drop policy if exists "unit_rosters write any educator" on public.unit_rosters;
create policy "unit_rosters write any educator" on public.unit_rosters for all using (public.is_educator(auth.uid())) with check (public.is_educator(auth.uid()));