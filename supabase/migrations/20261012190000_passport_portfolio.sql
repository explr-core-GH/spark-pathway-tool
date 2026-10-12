-- Passport redesign, phase 3: the living portfolio.
--
--   experiences       one row per thing a student did: formal WBL (stamped by a
--                     supervisor) and exposure (talks, shadows, tours, camps).
--   experience_ratings  competency ratings attached to an experience by its
--                     supervisor (written by the attestation flow, phase 4).
--   credentials       seals, certificates, college credit, badges.
--   portfolio_pieces  things the student made (files, links, repos, builds).
--   students.about_me the student's own words (the app drafts a version).
--
-- Rule from the spec: nothing displayed as verified is self-reported. A
-- student can edit their own rows, but a trigger stops them from touching
-- the verification fields; those change only through the service role.

-- ───────────────────────── students ────────────────────────────────────
alter table public.students add column if not exists about_me text;
alter table public.students add column if not exists headline text;

-- ───────────────────────── experiences ─────────────────────────────────
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  source text not null default 'external' check (source in ('library','external')),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  internship_slug text,
  explr_camp_id uuid references public.explr_camps(id) on delete set null,
  title text not null,
  organization text,
  role_title text,
  stage text not null check (stage in ('awareness','exploration','preparation','participation')),
  experience_type text not null,
  career_cluster text,
  riasec_module char(1) check (riasec_module in ('R','I','A','S','E','C')),
  start_date date,
  end_date date,
  hours numeric(7,1) check (hours is null or hours >= 0),
  compensation_type text check (compensation_type in ('paid','stipend','credit','unpaid')),
  duties text,
  reflection text,
  supervisor_name text,
  supervisor_email text,
  status text not null default 'self_reported'
    check (status in ('self_reported','pending_supervisor','verified','disputed','revoked')),
  verified_at timestamptz,
  verified_hours numeric(7,1),
  attestation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_experiences_student on public.experiences(student_id);
create index if not exists idx_experiences_status on public.experiences(status);

drop trigger if exists experiences_set_updated_at on public.experiences;
create trigger experiences_set_updated_at
  before update on public.experiences
  for each row execute function public.set_updated_at();

-- Students may edit their own experience but never its verification state.
create or replace function public.protect_experience_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.student_id and not public.is_admin(auth.uid()) then
    if new.status is distinct from old.status
       or new.verified_at is distinct from old.verified_at
       or new.verified_hours is distinct from old.verified_hours
       or new.attestation is distinct from old.attestation then
      raise exception 'Verification fields can only be changed by a supervisor attestation';
    end if;
    -- Editing a verified experience clears the mark until it is re-attested.
    if old.status = 'verified' and (
         new.title is distinct from old.title
      or new.hours is distinct from old.hours
      or new.duties is distinct from old.duties
      or new.start_date is distinct from old.start_date
      or new.end_date is distinct from old.end_date
      or new.experience_type is distinct from old.experience_type
    ) then
      new.status := 'self_reported';
      new.verified_at := null;
      new.verified_hours := null;
      new.attestation := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists experiences_protect_verification on public.experiences;
create trigger experiences_protect_verification
  before update on public.experiences
  for each row execute function public.protect_experience_verification();

alter table public.experiences enable row level security;

drop policy if exists "experiences self all" on public.experiences;
create policy "experiences self all" on public.experiences
  for all using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and status in ('self_reported','pending_supervisor')
    and verified_at is null
    and attestation is null
  );

drop policy if exists "experiences staff read" on public.experiences;
create policy "experiences staff read" on public.experiences
  for select using (
    public.is_admin(auth.uid())
    or (public.is_educator(auth.uid()) and (
      public.educator_can_access_student(auth.uid(), student_id)
      or exists (
        select 1 from public.class_students cs join public.classes c on c.id = cs.class_id
        where cs.student_id = experiences.student_id and c.educator_id = auth.uid()
      )
    ))
  );

drop policy if exists "experiences admin write" on public.experiences;
create policy "experiences admin write" on public.experiences
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ───────────────────────── experience_ratings ──────────────────────────
create table if not exists public.experience_ratings (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references public.experiences(id) on delete cascade,
  competency text not null,
  omj_skill text,
  rating_baseline int check (rating_baseline between 1 and 4),
  rating_final int not null check (rating_final between 1 and 4),
  setting text not null check (setting in ('school','work','community')),
  rater_name text not null,
  rater_email text,
  comment text,
  rated_at timestamptz not null default now()
);
create index if not exists idx_experience_ratings_experience on public.experience_ratings(experience_id);

alter table public.experience_ratings enable row level security;

drop policy if exists "experience_ratings self read" on public.experience_ratings;
create policy "experience_ratings self read" on public.experience_ratings
  for select using (
    exists (select 1 from public.experiences e where e.id = experience_id and e.student_id = auth.uid())
  );

drop policy if exists "experience_ratings staff read" on public.experience_ratings;
create policy "experience_ratings staff read" on public.experience_ratings
  for select using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.experiences e
      where e.id = experience_id
        and public.is_educator(auth.uid())
        and public.educator_can_access_student(auth.uid(), e.student_id)
    )
  );

drop policy if exists "experience_ratings admin write" on public.experience_ratings;
create policy "experience_ratings admin write" on public.experience_ratings
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ───────────────────────── credentials ─────────────────────────────────
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  type text not null check (type in ('industry_recognized_credential','dual_credit_ccp','diploma_seal','micro_credential','certificate','badge')),
  title text not null,
  issuer text,
  issued_at date,
  credits numeric(4,1),
  evidence_url text,
  verification_method text not null default 'self_reported'
    check (verification_method in ('issuer_signed','document_upload','self_reported')),
  created_at timestamptz not null default now()
);
create index if not exists idx_credentials_student on public.credentials(student_id);

alter table public.credentials enable row level security;

drop policy if exists "credentials self all" on public.credentials;
create policy "credentials self all" on public.credentials
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid() and verification_method = 'self_reported');

drop policy if exists "credentials staff read" on public.credentials;
create policy "credentials staff read" on public.credentials
  for select using (
    public.is_admin(auth.uid())
    or (public.is_educator(auth.uid()) and public.educator_can_access_student(auth.uid(), student_id))
  );

drop policy if exists "credentials admin write" on public.credentials;
create policy "credentials admin write" on public.credentials
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ───────────────────────── portfolio_pieces ────────────────────────────
create table if not exists public.portfolio_pieces (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  context text,
  artifact_type text not null default 'link'
    check (artifact_type in ('file','link','image','video','audio','git_repo','cad_model','dataset','writing','design','build')),
  url text,
  media_consent boolean not null default false,
  competency_tags text[] not null default '{}',
  reflection text,
  experience_id uuid references public.experiences(id) on delete set null,
  reviewed_by text,
  reviewed_at timestamptz,
  visibility text not null default 'private' check (visibility in ('private','family','public')),
  created_at timestamptz not null default now()
);
create index if not exists idx_portfolio_pieces_student on public.portfolio_pieces(student_id);

alter table public.portfolio_pieces enable row level security;

drop policy if exists "portfolio_pieces self all" on public.portfolio_pieces;
create policy "portfolio_pieces self all" on public.portfolio_pieces
  for all using (student_id = auth.uid())
  with check (student_id = auth.uid() and reviewed_at is null);

drop policy if exists "portfolio_pieces staff read" on public.portfolio_pieces;
create policy "portfolio_pieces staff read" on public.portfolio_pieces
  for select using (
    public.is_admin(auth.uid())
    or (public.is_educator(auth.uid()) and public.educator_can_access_student(auth.uid(), student_id))
  );

drop policy if exists "portfolio_pieces admin write" on public.portfolio_pieces;
create policy "portfolio_pieces admin write" on public.portfolio_pieces
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

notify pgrst, 'reload schema';
