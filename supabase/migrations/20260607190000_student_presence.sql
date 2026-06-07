-- Live presence for the admin proctor view.
--
-- Each signed-in user heartbeats their current location to this table
-- (one row, upserted). The roster Live Monitor reads it to show who's
-- online and what part of the site they're in. "What question" is read
-- separately from assessment_sessions.current_index, which admins can
-- already see.
--
-- FK to auth.users (not students) so the heartbeat works for any role
-- without breaking; the monitor only ever looks at a camp's student ids.

create table if not exists public.student_presence (
  student_id uuid primary key references auth.users(id) on delete cascade,
  path text,
  label text,
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_student_presence_seen
  on public.student_presence(last_seen_at);

alter table public.student_presence enable row level security;

-- Each user writes only their own presence row.
drop policy if exists "student_presence self upsert" on public.student_presence;
create policy "student_presence self upsert" on public.student_presence
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Educators + admins read everyone's (the monitor).
drop policy if exists "student_presence staff read" on public.student_presence;
create policy "student_presence staff read" on public.student_presence
  for select using (
    public.is_educator(auth.uid()) or public.is_admin(auth.uid())
  );

notify pgrst, 'reload schema';
