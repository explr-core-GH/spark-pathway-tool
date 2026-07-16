-- End-of-internship assessment survey ("internship_exit").
--
-- A single-sitting exit survey with THEN/NOW dual rating: STEM efficacy
-- constructs, career interest, a RIASEC interest snapshot, a next-steps
-- checklist, and open reflection questions. Items live in
-- src/lib/explr-stem/items.json; this migration just widens the allowed
-- survey_type values (administration stays 'retrospective' — single sitting).

alter table public.survey_assignments
  drop constraint if exists survey_assignments_survey_type_check;

alter table public.survey_assignments
  add constraint survey_assignments_survey_type_check
  check (survey_type in ('retrospective', 'middle_school', 'high_school', 'internship_exit'));

notify pgrst, 'reload schema';
