
create table public.aptitude_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  band text not null check (band in ('MS','HS')),
  subscale_scores jsonb not null,
  total_score integer not null,
  total_items integer not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);

alter table public.aptitude_results enable row level security;

create policy "aptitude self all"
  on public.aptitude_results for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "aptitude educator read"
  on public.aptitude_results for select
  using (is_educator(auth.uid()));

create index aptitude_results_student_idx on public.aptitude_results(student_id, completed_at desc);
