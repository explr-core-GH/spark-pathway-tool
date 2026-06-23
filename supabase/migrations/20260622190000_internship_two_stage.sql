-- Two-stage internship application: select → admin approves → complete.
--
-- internship_selections holds the per-internship request / approval /
-- completion state plus link-proof screenshots. The shared résumé stays in
-- internship_applications, now also readable by the owning organization.

create table if not exists public.internship_selections (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  internship_ref text not null,            -- catalog slug or 'opp:<id>'
  opportunity_id uuid references public.opportunities(id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested','approved','denied','submitted')),
  link_proofs jsonb not null default '[]'::jsonb,  -- [{url,label,screenshot_url}]
  decided_notes text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  submitted_at timestamptz,
  unique (student_id, internship_ref)
);
create index if not exists idx_internship_selections_student
  on public.internship_selections(student_id);
create index if not exists idx_internship_selections_opp
  on public.internship_selections(opportunity_id);
alter table public.internship_selections enable row level security;

drop policy if exists "selections self" on public.internship_selections;
create policy "selections self" on public.internship_selections
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "selections staff read" on public.internship_selections;
create policy "selections staff read" on public.internship_selections
  for select using (public.is_educator(auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "selections admin write" on public.internship_selections;
create policy "selections admin write" on public.internship_selections
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "selections org read" on public.internship_selections;
create policy "selections org read" on public.internship_selections
  for select using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and o.org_id = auth.uid()
    )
  );

-- The owning organization can read the shared résumé of students who submitted
-- an application to one of its internships.
drop policy if exists "internship_applications org read" on public.internship_applications;
create policy "internship_applications org read" on public.internship_applications
  for select using (
    exists (
      select 1 from public.internship_selections s
      join public.opportunities o on o.id = s.opportunity_id
      where s.student_id = internship_applications.student_id
        and s.status = 'submitted'
        and o.org_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
