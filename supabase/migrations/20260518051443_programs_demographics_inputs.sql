-- Programs + educators: capture school connection, student count, and grade
-- levels so the admin demographics dashboard can compute weighted averages
-- across the Ohio Dept of Ed building demographics.
--
-- grade_levels is a smallint[] where 0 = kindergarten and 1..12 = grades 1-12.

alter table public.programs
  add column if not exists school_irn text,
  add column if not exists school_name text,
  add column if not exists student_count integer
    check (student_count is null or student_count >= 0),
  add column if not exists grade_levels smallint[]
    check (
      grade_levels is null
      or (
        array_length(grade_levels, 1) is not null
        and (select bool_and(g between 0 and 12) from unnest(grade_levels) g)
      )
    );

create index if not exists idx_programs_school_irn on public.programs(school_irn);

alter table public.educators
  add column if not exists student_count integer
    check (student_count is null or student_count >= 0),
  add column if not exists grade_levels smallint[]
    check (
      grade_levels is null
      or (
        array_length(grade_levels, 1) is not null
        and (select bool_and(g between 0 and 12) from unnest(grade_levels) g)
      )
    );
