-- Passport redesign, phase 4: verification.
--
-- attestation_requests: one emailed link per stamp request. The supervisor
-- needs no account; knowing the token is the proof. The request stores only
-- a hash of the token. Completing it writes experience_ratings and freezes
-- the experience as verified (service role only).

create table if not exists public.attestation_requests (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  token_hash text not null unique,
  supervisor_name text not null,
  supervisor_email text not null,
  status text not null default 'pending' check (status in ('pending','completed','declined','expired')),
  sent_at timestamptz,
  email_error text,
  opened_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
create index if not exists idx_attestation_requests_experience on public.attestation_requests(experience_id);
create index if not exists idx_attestation_requests_student on public.attestation_requests(student_id);

alter table public.attestation_requests enable row level security;

-- Students see the status of their own requests (never the token).
drop policy if exists "attestation_requests self read" on public.attestation_requests;
create policy "attestation_requests self read" on public.attestation_requests
  for select using (student_id = auth.uid());

drop policy if exists "attestation_requests staff read" on public.attestation_requests;
create policy "attestation_requests staff read" on public.attestation_requests
  for select using (public.staff_can_see_student(auth.uid(), student_id));

drop policy if exists "attestation_requests admin write" on public.attestation_requests;
create policy "attestation_requests admin write" on public.attestation_requests
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Class teachers can read their students' basic rows (camp educators and
-- admins already could). Needed for checkpoint review.
drop policy if exists "students class teacher read" on public.students;
create policy "students class teacher read" on public.students
  for select using (
    public.is_educator(auth.uid()) and exists (
      select 1 from public.class_students cs join public.classes c on c.id = cs.class_id
      where cs.student_id = students.id and c.educator_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
