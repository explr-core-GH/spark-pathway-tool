-- Unify org-created internships with the apply pipeline, plus worksite
-- requirements, application links, and uploadable/signable forms.

-- Worksite requirements checklist (dress code etc.) + application links the
-- student must complete, stored on the opportunity.
alter table public.opportunities
  add column if not exists requirements jsonb not null default '[]'::jsonb,
  add column if not exists application_links jsonb not null default '[]'::jsonb;

-- Tie an internship registration to its full résumé application.
alter table public.opportunity_registrations
  add column if not exists application_id uuid;

-- Org-uploaded blank forms for an opportunity (interns download / sign).
create table if not exists public.opportunity_forms (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  name text not null,
  file_url text,
  requires_signature boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_opp_forms_opp on public.opportunity_forms(opportunity_id);
alter table public.opportunity_forms enable row level security;

-- Readable for approved opportunities (students download) + owner + staff.
drop policy if exists "opp_forms read" on public.opportunity_forms;
create policy "opp_forms read" on public.opportunity_forms
  for select using (
    exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and (o.status = 'approved' or o.org_id = auth.uid())
    )
    or public.is_admin(auth.uid()) or public.is_educator(auth.uid())
  );

drop policy if exists "opp_forms org write" on public.opportunity_forms;
create policy "opp_forms org write" on public.opportunity_forms
  for all using (
    exists (select 1 from public.opportunities o where o.id = opportunity_id and o.org_id = auth.uid())
  ) with check (
    exists (select 1 from public.opportunities o where o.id = opportunity_id and o.org_id = auth.uid())
  );

drop policy if exists "opp_forms admin" on public.opportunity_forms;
create policy "opp_forms admin" on public.opportunity_forms
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- A student's completion of a form: an uploaded copy and/or a typed signature.
create table if not exists public.form_completions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.opportunity_forms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  completed_file_url text,
  signed_name text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (form_id, student_id)
);
create index if not exists idx_form_completions_form on public.form_completions(form_id);
alter table public.form_completions enable row level security;

drop policy if exists "form_completions self" on public.form_completions;
create policy "form_completions self" on public.form_completions
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "form_completions org read" on public.form_completions;
create policy "form_completions org read" on public.form_completions
  for select using (
    exists (
      select 1 from public.opportunity_forms f
      join public.opportunities o on o.id = f.opportunity_id
      where f.id = form_id and o.org_id = auth.uid()
    )
  );

drop policy if exists "form_completions admin" on public.form_completions;
create policy "form_completions admin" on public.form_completions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Students upload completed forms here (blank forms live in org-media).
insert into storage.buckets (id, name, public)
values ('form-uploads', 'form-uploads', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "form-uploads read" on storage.objects;
create policy "form-uploads read" on storage.objects
  for select using (bucket_id = 'form-uploads');

drop policy if exists "form-uploads write" on storage.objects;
create policy "form-uploads write" on storage.objects
  for insert with check (bucket_id = 'form-uploads' and auth.uid() is not null);

drop policy if exists "form-uploads admin manage" on storage.objects;
create policy "form-uploads admin manage" on storage.objects
  for delete using (bucket_id = 'form-uploads' and public.is_admin(auth.uid()));

notify pgrst, 'reload schema';
