-- Optional classroom / homeroom tag per camp-student login.
--
-- ExplrMore registrations don't carry a class or teacher, so admins set this
-- themselves to group and sort a camp roster by classroom.

alter table public.camp_student_logins
  add column if not exists classroom text;

notify pgrst, 'reload schema';
