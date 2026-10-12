-- Passport redesign, phase 2: sign-in.
--
--   1. Security: close two privilege-escalation holes (any signed-in user
--      could insert themselves as an admin, or as an *approved* educator).
--   2. Grades 4-8 ("Explore" band): allow grade 4; add picture/QR logins.
--   3. Join codes on classes and camps so a student can open their class
--      roster without typing a password.
--   4. Family codes: a student-generated code that opens a read-only
--      family view without an account.

-- ───────────────────────── 1. security ─────────────────────────────────

-- Admins are created only through the service role (invite acceptance
-- runs server-side now). Nobody may insert into public.admins from the
-- browser.
drop policy if exists "admins self insert" on public.admins;

-- A self-registered educator row must start unapproved and non-admin.
-- Approval is granted by an admin (update policy) or by the invite
-- server function (service role).
drop policy if exists "educators self insert" on public.educators;
create policy "educators self insert" on public.educators
  for insert
  with check (
    auth.uid() = id
    and approved = false
    and role = 'educator'
  );

-- ───────────────────────── 2. grade 4 ──────────────────────────────────

do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'students'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%grade%'
  loop
    execute format('alter table public.students drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.students
  add constraint students_grade_check check (grade between 4 and 12);

-- ───────────────────────── 3. join codes ───────────────────────────────

alter table public.classes add column if not exists join_code text unique;
alter table public.explr_camps add column if not exists join_code text unique;

-- Does this educator own / staff this class?
create or replace function public.educator_can_access_class(_educator_id uuid, _class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes c
    where c.id = _class_id and c.educator_id = _educator_id
  );
$$;
revoke all on function public.educator_can_access_class(uuid, uuid) from public;
grant execute on function public.educator_can_access_class(uuid, uuid) to authenticated;

-- ───────────────────────── 4. explore logins ───────────────────────────

-- One row per grade 4-8 student. Holds only hashes: the three-shape secret
-- and the QR token are never stored in plaintext. Cards are printed at
-- provisioning time; re-printing rotates them.
create table if not exists public.explore_logins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  avatar_shape text not null,
  avatar_color text not null,
  secret_hash text not null,
  token_hash text not null unique,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now(),
  last_signed_in_at timestamptz
);

alter table public.explore_logins enable row level security;

-- Admins manage; a class teacher or camp educator may read the rows for
-- their own students (to see who has a card). Writes go through the
-- service role so hashes are generated server-side.
drop policy if exists "explore_logins admin all" on public.explore_logins;
create policy "explore_logins admin all" on public.explore_logins
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "explore_logins educator read" on public.explore_logins;
create policy "explore_logins educator read" on public.explore_logins
  for select using (
    public.is_educator(auth.uid())
    and (
      public.educator_can_access_student(auth.uid(), student_id)
      or exists (
        select 1 from public.class_students cs
        join public.classes c on c.id = cs.class_id
        where cs.student_id = explore_logins.student_id
          and c.educator_id = auth.uid()
      )
    )
  );

-- Class teachers can read their own class rosters (previously admin-only
-- writes but staff-wide reads already existed; this adds the write so a
-- teacher can add a 4-8 student to their own class).
drop policy if exists "class_students teacher write" on public.class_students;
create policy "class_students teacher write" on public.class_students
  for insert
  with check (
    public.is_educator(auth.uid())
    and public.educator_can_access_class(auth.uid(), class_id)
  );

-- ───────────────────────── 5. family codes ─────────────────────────────

create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  code_hash text not null unique,
  label text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  revoked_at timestamptz,
  last_used_at timestamptz
);

create index if not exists idx_family_links_student on public.family_links(student_id);

alter table public.family_links enable row level security;

-- Students see and revoke their own codes; the code itself is created by
-- the server function so only the hash is stored.
drop policy if exists "family_links self read" on public.family_links;
create policy "family_links self read" on public.family_links
  for select using (student_id = auth.uid());

drop policy if exists "family_links self revoke" on public.family_links;
create policy "family_links self revoke" on public.family_links
  for update using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "family_links admin read" on public.family_links;
create policy "family_links admin read" on public.family_links
  for select using (public.is_admin(auth.uid()));

-- A redeemed code becomes a family session (30 days). Service role only.
create table if not exists public.family_sessions (
  id uuid primary key default gen_random_uuid(),
  family_link_id uuid not null references public.family_links(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  last_seen_at timestamptz
);

alter table public.family_sessions enable row level security;
-- No policies on purpose: only the service role reads or writes sessions.

notify pgrst, 'reload schema';
