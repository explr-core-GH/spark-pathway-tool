-- Students rank the internships they select (1 = top choice). Required at
-- stage 1, before they can request approval to apply.

alter table public.internship_selections
  add column if not exists rank int;

notify pgrst, 'reload schema';
