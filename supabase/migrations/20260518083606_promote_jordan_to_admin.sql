-- One-off: promote j.seigler@csuohio.edu from educator (STEM) to admin.
-- Per the no-overlap rule, the user is moved to public.admins and their
-- educators row is removed. Idempotent — safe to re-run.

do $$
declare
  v_user_id uuid;
  v_full_name text;
begin
  -- Find the auth.users row by email (lower-cased to match the seed trigger).
  select id into v_user_id
  from auth.users
  where lower(email) = 'j.seigler@csuohio.edu'
  limit 1;

  if v_user_id is null then
    raise notice 'No auth.users row for j.seigler@csuohio.edu — sign up first, then re-run this migration.';
    return;
  end if;

  -- Reuse the educator's full_name if there's one (otherwise fall back).
  select full_name into v_full_name
  from public.educators
  where id = v_user_id;

  -- Insert into admins. on conflict (id) handles re-runs.
  insert into public.admins (id, full_name, email)
  values (
    v_user_id,
    coalesce(v_full_name, 'Jordan Seigler'),
    'j.seigler@csuohio.edu'
  )
  on conflict (id) do nothing;

  -- Drop the educators row to enforce no-overlap.
  delete from public.educators where id = v_user_id;

  raise notice 'Promoted % to admin and removed their educators row.', v_user_id;
end$$;
