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
        and 0 <= ALL(grade_levels)
        and 12 >= ALL(grade_levels)
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
        and 0 <= ALL(grade_levels)
        and 12 >= ALL(grade_levels)
      )
    );

notify pgrst, 'reload schema';