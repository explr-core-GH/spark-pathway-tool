-- Classes: a teacher's classroom as a first-class rostered group, alongside
-- camps (explr_camps) and internships. A class = one educator + a roster of
-- existing student accounts + a grade/period. Powers the entity-first admin
-- at /educator/admin/groups/classes.

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  educator_id uuid references public.educators(id) on delete set null,
  grade int,
  period text,
  school_irn text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create index if not exists idx_class_students_class
  on public.class_students(class_id);
create index if not exists idx_class_students_student
  on public.class_students(student_id);

alter table public.classes enable row level security;
alter table public.class_students enable row level security;

-- Staff (educators + admins) can read classes; only admins write.
drop policy if exists "classes staff read" on public.classes;
create policy "classes staff read" on public.classes
  for select using (
    public.is_educator(auth.uid()) or public.is_admin(auth.uid())
  );

drop policy if exists "classes admin write" on public.classes;
create policy "classes admin write" on public.classes
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "class_students staff read" on public.class_students;
create policy "class_students staff read" on public.class_students
  for select using (
    public.is_educator(auth.uid()) or public.is_admin(auth.uid())
  );

drop policy if exists "class_students admin write" on public.class_students;
create policy "class_students admin write" on public.class_students
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Students can see which classes they're in (mirrors student_camp_links).
drop policy if exists "class_students self read" on public.class_students;
create policy "class_students self read" on public.class_students
  for select using (student_id = auth.uid());

notify pgrst, 'reload schema';
