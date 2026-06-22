-- Organization portal.
--
-- Organizations are a fourth account type (alongside admins / educators /
-- students). They self-register, build opportunities through a configurable
-- step-by-step wizard, and submit them for admin review. Approved
-- opportunities are publicly readable so they can surface to families.
--
-- Four opportunity types: camp (gr 4-8), workshop (any, 1-time), internship
-- (gr 9-12, always in-system), ongoing (any, class/club).

-- ── 1. organizations ────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id uuid primary key,
  name text not null,
  contact_name text,
  contact_email text,
  website text,
  logo_url text,
  created_at timestamptz not null default now()
);
alter table public.organizations enable row level security;

create or replace function public.is_organization(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.organizations o where o.id = uid)
$$;

drop policy if exists "organizations self all" on public.organizations;
create policy "organizations self all" on public.organizations
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "organizations staff read" on public.organizations;
create policy "organizations staff read" on public.organizations
  for select using (public.is_educator(auth.uid()) or public.is_admin(auth.uid()));

-- ── 2. opportunities ────────────────────────────────────────────────────────
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('camp','workshop','internship','ongoing')),
  name text,
  description text,
  start_date date,
  end_date date,
  schedule text,
  grade_min int,
  grade_max int,
  is_free boolean not null default true,
  cost_cents int,
  capacity int,
  location text,
  image_url text,
  registration_mode text not null default 'internal'
    check (registration_mode in ('internal','external')),
  external_url text,
  riasec_code text,
  riasec_weights jsonb,
  custom jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','submitted','approved','rejected')),
  review_notes text,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_opportunities_org on public.opportunities(org_id);
create index if not exists idx_opportunities_status on public.opportunities(status);
alter table public.opportunities enable row level security;

drop policy if exists "opportunities owner all" on public.opportunities;
create policy "opportunities owner all" on public.opportunities
  for all using (auth.uid() = org_id) with check (auth.uid() = org_id);

drop policy if exists "opportunities staff read" on public.opportunities;
create policy "opportunities staff read" on public.opportunities
  for select using (public.is_educator(auth.uid()) or public.is_admin(auth.uid()));

drop policy if exists "opportunities admin update" on public.opportunities;
create policy "opportunities admin update" on public.opportunities
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "opportunities public read approved" on public.opportunities;
create policy "opportunities public read approved" on public.opportunities
  for select using (status = 'approved');

-- ── 3. wizard field config (core + admin-added custom fields, per type) ──────
create table if not exists public.opportunity_form_fields (
  id uuid primary key default gen_random_uuid(),
  opportunity_type text not null
    check (opportunity_type in ('camp','workshop','internship','ongoing')),
  field_key text not null,
  label text not null,
  help_text text,
  field_type text not null default 'text'
    check (field_type in ('text','textarea','number','select','checkbox','date')),
  options jsonb,
  required boolean not null default false,
  enabled boolean not null default true,
  sort_order int not null default 0,
  is_core boolean not null default false,
  created_at timestamptz not null default now(),
  unique (opportunity_type, field_key)
);
alter table public.opportunity_form_fields enable row level security;

drop policy if exists "form_fields read" on public.opportunity_form_fields;
create policy "form_fields read" on public.opportunity_form_fields
  for select using (auth.uid() is not null);

drop policy if exists "form_fields admin write" on public.opportunity_form_fields;
create policy "form_fields admin write" on public.opportunity_form_fields
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Seed the core fields for every type (admins toggle / relabel / reorder).
insert into public.opportunity_form_fields
  (opportunity_type, field_key, label, help_text, field_type, required, enabled, sort_order, is_core)
select t.type, f.field_key, f.label, f.help_text, f.field_type, f.required, true, f.sort_order, true
from (values ('camp'),('workshop'),('internship'),('ongoing')) as t(type)
cross join (values
  ('name',        'Event name',                          null,                                    'text',     true,  10),
  ('description', 'Description',                          'What will students do?',                'textarea', true,  20),
  ('dates',       'Dates',                               null,                                    'date',     true,  30),
  ('schedule',    'Times / schedule',                    'Daily times or recurring schedule',     'text',     false, 40),
  ('location',    'Location',                            null,                                    'text',     true,  50),
  ('registration','How students register',               null,                                    'text',     false, 60),
  ('grades',      'Grade range',                         null,                                    'number',   false, 70),
  ('capacity',    'Students accepted',                   null,                                    'number',   false, 80),
  ('cost',        'Cost',                                null,                                    'number',   false, 90),
  ('riasec',      'Time by activity',                    'Auto-codes a RIASEC interest profile',  'text',     false, 100)
) as f(field_key,label,help_text,field_type,required,sort_order)
on conflict (opportunity_type, field_key) do nothing;

-- A photo field for the visual programs (camps + workshops).
insert into public.opportunity_form_fields
  (opportunity_type, field_key, label, help_text, field_type, required, enabled, sort_order, is_core)
select t.type, 'image', 'Photo', 'A photo students & families will see', 'text', false, true, 95, true
from (values ('camp'),('workshop')) as t(type)
on conflict (opportunity_type, field_key) do nothing;

-- ── 4. media bucket (org logos + opportunity photos) ────────────────────────
insert into storage.buckets (id, name, public)
values ('org-media', 'org-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "org-media public read" on storage.objects;
create policy "org-media public read" on storage.objects
  for select using (bucket_id = 'org-media');

drop policy if exists "org-media write" on storage.objects;
create policy "org-media write" on storage.objects
  for insert with check (
    bucket_id = 'org-media'
    and (public.is_organization(auth.uid()) or public.is_admin(auth.uid()))
  );

drop policy if exists "org-media update" on storage.objects;
create policy "org-media update" on storage.objects
  for update using (
    bucket_id = 'org-media'
    and (public.is_organization(auth.uid()) or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'org-media'
    and (public.is_organization(auth.uid()) or public.is_admin(auth.uid()))
  );

drop policy if exists "org-media delete" on storage.objects;
create policy "org-media delete" on storage.objects
  for delete using (
    bucket_id = 'org-media'
    and (public.is_organization(auth.uid()) or public.is_admin(auth.uid()))
  );

notify pgrst, 'reload schema';
