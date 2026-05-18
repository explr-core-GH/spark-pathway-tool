-- Worksites + worksite rosters, synced from an external Lovable project's
-- worksites-roster-api edge function. The sync runs hourly via pg_cron
-- and is also invokable on-demand from the /worksites UI.
--
-- Source payload shape (from worksites-roster-api):
--   { worksites: [{ id, name, category, ..., students: [{ intern_id, ... }] }],
--     generated_at: ISO }
--
-- We key worksites by the external `id` stored as source_id, and students
-- by (worksite_id, intern_id). Upserts are idempotent.

-- ---------- Tables ----------

create table if not exists public.worksites (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  name text not null,
  category text,
  description text,
  location text,
  contact_name text,
  contact_email text,
  capacity integer,
  filled integer,
  status text,
  tags text[] not null default '{}',
  imported_at timestamptz not null default now()
);

create index if not exists idx_worksites_source_id on public.worksites(source_id);
create index if not exists idx_worksites_status on public.worksites(status);

create table if not exists public.worksite_students (
  id uuid primary key default gen_random_uuid(),
  worksite_id uuid not null references public.worksites(id) on delete cascade,
  intern_id text not null,
  first_name text not null,
  last_name text not null,
  dob text,
  email text,
  school text,
  grade text,
  status text,
  imported_at timestamptz not null default now(),
  unique (worksite_id, intern_id)
);

create index if not exists idx_worksite_students_worksite on public.worksite_students(worksite_id);

-- Last-sync log so the UI can show 'last synced X minutes ago'.
create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  worksites_synced integer,
  students_synced integer,
  ok boolean not null default false,
  error text
);

create index if not exists idx_sync_runs_kind_started on public.sync_runs(kind, started_at desc);

-- ---------- RLS ----------

alter table public.worksites enable row level security;
alter table public.worksite_students enable row level security;
alter table public.sync_runs enable row level security;

-- Admins manage everything.
drop policy if exists "worksites admin all" on public.worksites;
create policy "worksites admin all" on public.worksites
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "worksite_students admin all" on public.worksite_students;
create policy "worksite_students admin all" on public.worksite_students
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "sync_runs admin all" on public.sync_runs;
create policy "sync_runs admin all" on public.sync_runs
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Any signed-in user (educator or admin) can read worksites + their roster.
-- Tighten if you want to lock to admins only.
drop policy if exists "worksites authed read" on public.worksites;
create policy "worksites authed read" on public.worksites
  for select using (auth.uid() is not null);

drop policy if exists "worksite_students authed read" on public.worksite_students;
create policy "worksite_students authed read" on public.worksite_students
  for select using (auth.uid() is not null);

drop policy if exists "sync_runs authed read" on public.sync_runs;
create policy "sync_runs authed read" on public.sync_runs
  for select using (auth.uid() is not null);

-- ---------- Hourly cron schedule (pg_cron + pg_net) ----------
--
-- Calls the sync-worksites edge function once an hour. Auth uses the
-- project's service-role key, stored in Supabase Vault under the secret
-- name `project_service_role_key`. The project URL is read from
-- `project_url`. Set both via Supabase Dashboard > Project Settings >
-- Vault before the cron will succeed:
--   project_url            = https://<project-ref>.supabase.co
--   project_service_role_key = <service role key>
--
-- If you haven't enabled the extensions yet, this block will enable them.
-- The schedule is idempotent — running this migration again unschedules
-- the previous job before creating it fresh.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper: builds the request URL + auth header from vault secrets and
-- fires off the POST. Returning the net request id keeps cron logs useful.
create or replace function public.sync_worksites_via_cron()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_url text;
  v_key text;
  v_request_id bigint;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'project_service_role_key' limit 1;

  if v_url is null or v_key is null then
    raise notice 'sync_worksites_via_cron: missing vault secrets project_url or project_service_role_key';
    return null;
  end if;

  select net.http_post(
    url := v_url || '/functions/v1/sync-worksites',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('source', 'pg_cron')
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke execute on function public.sync_worksites_via_cron() from public, anon, authenticated;

-- (Re)schedule the hourly job. cron.unschedule errors if the job doesn't
-- exist, so the do-block swallows that case.
do $$
begin
  perform cron.unschedule('sync-worksites-hourly');
exception when others then
  -- nothing to unschedule on first run
  null;
end$$;

select cron.schedule(
  'sync-worksites-hourly',
  '0 * * * *',
  $$ select public.sync_worksites_via_cron(); $$
);

notify pgrst, 'reload schema';
