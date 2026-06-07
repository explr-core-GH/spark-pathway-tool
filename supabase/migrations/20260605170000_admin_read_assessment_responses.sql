-- Admin read on assessment_responses.
--
-- assessment_sessions already has an admin-read policy (migration
-- 20260605163353), but assessment_responses — which carries per-item
-- response_time_ms — was still self-only. Admins need it to report the
-- active time a student spent on an assessment (sum of item times),
-- which is more meaningful than wall-clock when a kid walks away mid-test.
--
-- Read-only for admins; the existing "self all" policy still governs
-- student writes.

drop policy if exists "session_responses admin read" on public.assessment_responses;
create policy "session_responses admin read" on public.assessment_responses
  for select using (public.is_admin(auth.uid()));

notify pgrst, 'reload schema';
