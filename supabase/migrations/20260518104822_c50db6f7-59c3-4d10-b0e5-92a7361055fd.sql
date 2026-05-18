-- 1. admins table
create table if not exists public.admins (
  id uuid primary key,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Recreate is_admin to point at the new table (was checking educators.role).
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where id = uid);
$$;

drop policy if exists "admins self or admin read" on public.admins;
create policy "admins self or admin read"
  on public.admins for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "admins admin write" on public.admins;
create policy "admins admin write"
  on public.admins for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 2. Promote j.seigler@csuohio.edu
do $$
declare
  v_user_id uuid;
  v_full_name text;
begin
  select id into v_user_id from auth.users where lower(email) = 'j.seigler@csuohio.edu' limit 1;
  if v_user_id is null then
    raise notice 'No auth.users row for j.seigler@csuohio.edu';
    return;
  end if;
  select full_name into v_full_name from public.educators where id = v_user_id;
  insert into public.admins (id, full_name, email)
  values (v_user_id, coalesce(v_full_name, 'Jordan Seigler'), 'j.seigler@csuohio.edu')
  on conflict (id) do nothing;
  delete from public.educators where id = v_user_id;
end$$;