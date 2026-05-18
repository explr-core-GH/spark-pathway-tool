create table if not exists public.explr_camps (
  id uuid primary key,
  title text not null,
  description text,
  date date,
  end_date date,
  time text,
  location text,
  age_range text,
  capacity integer,
  image text,
  category text,
  linked_camp_slug text,
  imported_at timestamptz not null default now(),
  source_updated_at timestamptz
);

create table if not exists public.explr_registrations (
  id uuid primary key,
  camp_id uuid not null references public.explr_camps(id) on delete cascade,
  child_name text not null,
  child_age integer,
  parent_name text,
  parent_email text,
  parent_phone text,
  status text,
  imported_at timestamptz not null default now(),
  source_created_at timestamptz
);

create index if not exists explr_registrations_camp_idx on public.explr_registrations(camp_id);
create index if not exists explr_camps_linked_slug_idx on public.explr_camps(linked_camp_slug);

alter table public.explr_camps enable row level security;
alter table public.explr_registrations enable row level security;

create policy "explr_camps admin write" on public.explr_camps
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "explr_camps educator read" on public.explr_camps
  for select using (is_educator(auth.uid()));

create policy "explr_registrations admin write" on public.explr_registrations
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
create policy "explr_registrations educator read" on public.explr_registrations
  for select using (is_educator(auth.uid()));