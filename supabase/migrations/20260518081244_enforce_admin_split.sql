-- Lock in the admins / educators split. No more overlap: a user is either
-- in public.admins OR public.educators, never both. educators.role is
-- always 'educator' going forward; admin status lives entirely in
-- public.admins (already the case for is_admin()).

-- 1) Drop the legacy auto-admin trigger on educators that set role='admin'.
--    Bootstrapping the first admin is handled by trg_auto_admin_seed_user
--    (on auth.users, inserts into admins) from migration 20260518053900.
drop trigger if exists trg_auto_admin_seed on public.educators;
drop function if exists public.auto_admin_seed();

-- 2) For any user who's in BOTH tables, drop the educators row. Admin is the
--    primary identity; the educator profile is collateral. If anyone wants
--    to keep both, they can manually re-create the educator row afterwards,
--    but the user has stated 'no overlap'.
delete from public.educators e
where exists (select 1 from public.admins a where a.id = e.id);

-- 3) Coerce any remaining role='admin' on educators back to 'educator'.
--    Admin power has already moved to public.admins; this just keeps the
--    column consistent so no UI accidentally treats it as a role flag.
update public.educators set role = 'educator' where role = 'admin';

notify pgrst, 'reload schema';
