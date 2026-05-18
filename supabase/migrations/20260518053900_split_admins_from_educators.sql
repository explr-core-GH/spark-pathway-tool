-- Split admins from educators.
--
-- Until now an "admin" was an educator row with role='admin'. That forced
-- every admin to also be tagged as an educator, which they shouldn't be.
-- This migration introduces a separate public.admins table and redirects
-- the public.is_admin() helper to it — every existing RLS policy that
-- relies on is_admin() automatically picks up the new source of truth.
--
-- educators.role is left in place for backwards compat but no longer
-- determines admin status. New admins do NOT need an educators row.

-- ---------- New tables ----------

create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_admins_email on public.admins(lower(email));

create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  invited_by uuid references public.admins(id) on delete set null,
  invited_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.admins(id) on delete set null
);

create index if not exists idx_admin_invites_token on public.admin_invites(token);
create index if not exists idx_admin_invites_email on public.admin_invites(lower(email));

-- ---------- Redirect is_admin() to the new table ----------
-- Every existing RLS policy already calls public.is_admin(auth.uid()), so
-- updating this single function flips every policy at once.

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where id = uid);
$$;

-- ---------- Backfill: existing role='admin' educators become admins ----------
-- This keeps any current admin signed in and able to use admin tools after
-- the cut-over. Their educators row is left untouched; it just no longer
-- determines admin status. New admins won't get an educator row.

insert into public.admins (id, full_name, email)
select id, full_name, email from public.educators where role = 'admin'
on conflict (id) do nothing;

-- ---------- Re-aim the auto-admin seed trigger ----------
-- The existing trigger on educators set role='admin' for j.seigler@csuohio.edu.
-- Switch to a separate trigger on auth.users so the special email becomes an
-- admin even if they never create an educators row.

create or replace function public.auto_admin_seed_on_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'j.seigler@csuohio.edu' then
    insert into public.admins (id, full_name, email)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

-- Keep the old educators trigger as a no-op fallback (drop it on next sweep).
drop trigger if exists trg_auto_admin_seed_user on auth.users;
create trigger trg_auto_admin_seed_user
  after insert on auth.users
  for each row execute function public.auto_admin_seed_on_user();

-- ---------- RLS for the new tables ----------

alter table public.admins enable row level security;
alter table public.admin_invites enable row level security;

-- admins self read; admins can read each other; nobody else can.
drop policy if exists "admins self read" on public.admins;
create policy "admins self read" on public.admins
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

-- An invite-accepting user can insert their own admins row (RLS-checked
-- against the matching invite token via the app — the policy below permits
-- self-insert; the route is responsible for validating the token first).
drop policy if exists "admins self insert" on public.admins;
create policy "admins self insert" on public.admins
  for insert with check (auth.uid() = id);

drop policy if exists "admins admin write" on public.admins;
create policy "admins admin write" on public.admins
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Admin invites: admins create; anyone can read by token (acceptance flow).
drop policy if exists "admin_invites read all" on public.admin_invites;
create policy "admin_invites read all" on public.admin_invites
  for select using (true);

drop policy if exists "admin_invites admin write" on public.admin_invites;
create policy "admin_invites admin write" on public.admin_invites
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Refresh the PostgREST schema cache so the new tables are visible
-- through the API immediately.
notify pgrst, 'reload schema';
