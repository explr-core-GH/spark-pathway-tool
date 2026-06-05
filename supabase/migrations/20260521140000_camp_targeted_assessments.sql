-- Allow assessment_targets to target a camp session directly.
--
-- Originally targets were either an educator (cascades to their roster) or a
-- single student. Camps with no educator assigned still need to be able to
-- receive assignments, and a camp-targeted row cascades to every student
-- linked to that camp via public.student_camp_links — the same bridge the
-- educator cascade uses, just one hop shorter.

alter table public.assessment_targets
  drop constraint if exists assessment_targets_target_type_check;

alter table public.assessment_targets
  add constraint assessment_targets_target_type_check
  check (target_type in ('educator', 'student', 'camp'));

notify pgrst, 'reload schema';
