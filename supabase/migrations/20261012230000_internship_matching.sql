-- Passport redesign, phase 6: the internship general application and matching.
--
-- internship_profiles: one reusable general application per student
-- (coursework, likes/dislikes, aspirations, availability, transportation,
-- optional demographics). Selections gain the acknowledgments a student
-- accepted for a specific listing and the match score an admin computed.

create table if not exists public.internship_profiles (
  student_id uuid primary key references public.students(id) on delete cascade,
  high_school text,
  grad_year int,
  career_aspiration text,
  intended_major text,
  intended_college text,
  likes text,
  dislikes text,
  coursework jsonb not null default '[]'::jsonb,       -- [{subject, course, grade_level, relevance}]
  availability jsonb not null default '{}'::jsonb,     -- {summer, school_year, days[], earliest, latest, notes}
  transportation text check (transportation is null or transportation in ('own','family','transit','bike_walk','needs_help')),
  work_authorization boolean,
  demographics jsonb not null default '{}'::jsonb,     -- optional, self-reported, for disaggregated reach reporting only
  updated_at timestamptz not null default now()
);

drop trigger if exists internship_profiles_set_updated_at on public.internship_profiles;
create trigger internship_profiles_set_updated_at
  before update on public.internship_profiles
  for each row execute function public.set_updated_at();

alter table public.internship_profiles enable row level security;

drop policy if exists "internship_profiles self" on public.internship_profiles;
create policy "internship_profiles self" on public.internship_profiles
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "internship_profiles staff read" on public.internship_profiles;
create policy "internship_profiles staff read" on public.internship_profiles
  for select using (public.staff_can_see_student(auth.uid(), student_id));

-- Demographics are never readable by partner organizations: the org read
-- policy on applications does not extend here, and no org policy exists.

alter table public.internship_selections add column if not exists acknowledgments text[] not null default '{}';
alter table public.internship_selections add column if not exists answers jsonb not null default '{}'::jsonb;
alter table public.internship_selections add column if not exists match_score numeric(5,4);
alter table public.internship_selections add column if not exists match_breakdown jsonb;
alter table public.internship_selections add column if not exists hard_fail text[] not null default '{}';
alter table public.internship_selections add column if not exists match_computed_at timestamptz;

notify pgrst, 'reload schema';
