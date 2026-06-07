-- Scheduling window for assigned assessments/surveys.
--
-- An assignment now optionally appears only between available_from and
-- available_until. Both null = always available (the prior behaviour). The
-- student dashboard + "assigned" pop-up hide assignments outside the window.

alter table public.assessment_targets
  add column if not exists available_from  timestamptz,
  add column if not exists available_until timestamptz;

notify pgrst, 'reload schema';
