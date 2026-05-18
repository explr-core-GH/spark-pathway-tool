-- Re-promote j.seigler@csuohio.edu to admin and install a trigger so any
-- future sign-up under that email lands in public.admins automatically.
--
-- Why we need this: the original promote migration (083606 / 104822) runs
-- exactly once per Supabase deploy. If the auth.users row for Jordan didn't
-- exist when those migrations applied, the migration's `if v_user_id is null
-- then return` branch fired and Jordan never got an admins row. He then
-- signs in, useEducator sees no admins row, isAdmin=false, RoleGuard kicks
-- him out of /educator/admin/* with "You don't have admin access."
--
-- The fix has two parts:
--   1. Promote whoever currently holds that email — handles the "I signed
--      up after the migration ran" case.
--   2. A trigger on auth.users so any future re-signup under that email
--      gets the admins row without us having to write a new migration.
--
-- The trigger also removes any educators row for the same email at the same
-- time, preserving the no-overlap invariant from migration 081244.

-- 1. Re-promote right now (idempotent — on conflict do nothing).
do $$
declare
  v_user_id uuid;
  v_full_name text;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'j.seigler@csuohio.edu'
  limit 1;

  if v_user_id is null then
    raise notice 'No auth.users row for j.seigler@csuohio.edu yet — the trigger below will catch them on sign-up.';
    return;
  end if;

  select full_name into v_full_name from public.educators where id = v_user_id;

  insert into public.admins (id, full_name, email)
  values (v_user_id, coalesce(v_full_name, 'Jordan Seigler'), 'j.seigler@csuohio.edu')
  on conflict (id) do nothing;

  delete from public.educators where id = v_user_id;

  raise notice 'Ensured % is in public.admins.', v_user_id;
end$$;

-- 2. Trigger: any new auth.users row whose email matches the seed-admin
-- list is auto-inserted into public.admins. Extend SEED_ADMIN_EMAILS later
-- by editing the array literal here and re-deploying.
create or replace function public.auto_promote_seed_admins()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
  v_seed_admins text[] := array['j.seigler@csuohio.edu'];
begin
  if v_email = '' then return new; end if;
  if not (v_email = any (v_seed_admins)) then return new; end if;

  insert into public.admins (id, full_name, email)
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data ->> 'full_name'),
      initcap(split_part(v_email, '@', 1))
    ),
    v_email
  )
  on conflict (id) do nothing;

  -- Keep the no-overlap invariant: a row in admins means no row in educators.
  delete from public.educators where id = new.id;

  return new;
end;
$$;

drop trigger if exists trg_auto_promote_seed_admins on auth.users;
create trigger trg_auto_promote_seed_admins
  after insert on auth.users
  for each row execute function public.auto_promote_seed_admins();
