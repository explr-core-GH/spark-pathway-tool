-- Let assessment_targets point at a class or an internship, so the entity
-- workspaces can assign assessments to a class roster or an internship's
-- placed students directly (mirrors the camp target added earlier).
--
-- Classes are uuid-keyed, so they use target_id like camp/educator/student.
-- Internships are slug-keyed, so they use the new target_slug column and
-- leave target_id null — hence target_id becomes nullable.
--
-- Student-side resolution (src/lib/use-assignments.ts) gains two cascade
-- paths: class_students → class targets (+ the class teacher's targets), and
-- internship_placements → internship targets (+ the internship's educators).

alter table public.assessment_targets
  drop constraint if exists assessment_targets_target_type_check;

alter table public.assessment_targets
  add constraint assessment_targets_target_type_check
  check (target_type in ('educator', 'student', 'camp', 'class', 'internship'));

alter table public.assessment_targets
  alter column target_id drop not null;

alter table public.assessment_targets
  add column if not exists target_slug text;

create index if not exists idx_assessment_targets_slug
  on public.assessment_targets(target_type, target_slug);

notify pgrst, 'reload schema';
