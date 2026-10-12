-- Passport redesign, phase 5: the partner portal's work-based learning gate.
--
-- Every opportunity carries the Ohio taxonomy (stage, experience_type), a
-- structured WBL detail record (mentor, work, learning, schedule, pay,
-- legal, access, commitments), the competencies it targets, and the EXPLR
-- gate result. Only `pass` opportunities get the endorsement badge or feed
-- verified records; others can still be listed as exposure.

alter table public.opportunities add column if not exists stage text
  check (stage is null or stage in ('awareness','exploration','preparation','participation'));
alter table public.opportunities add column if not exists experience_type text;
alter table public.opportunities add column if not exists wbl jsonb not null default '{}'::jsonb;
alter table public.opportunities add column if not exists target_competencies text[] not null default '{}';
alter table public.opportunities add column if not exists gate_status text not null default 'pending'
  check (gate_status in ('pending','pass','fail'));
alter table public.opportunities add column if not exists gate_evidence jsonb;
alter table public.opportunities add column if not exists gate_reviewed_at timestamptz;
alter table public.opportunities add column if not exists gate_reviewed_by uuid;

create index if not exists idx_opportunities_gate on public.opportunities(gate_status);

-- Owners edit their listing but never the gate decision.
create or replace function public.protect_opportunity_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = old.org_id and not public.is_admin(auth.uid()) then
    if new.gate_status is distinct from old.gate_status
       or new.gate_evidence is distinct from old.gate_evidence
       or new.gate_reviewed_at is distinct from old.gate_reviewed_at
       or new.gate_reviewed_by is distinct from old.gate_reviewed_by then
      raise exception 'The EXPLR gate is set by EXPLR review, not the listing owner';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists opportunities_protect_gate on public.opportunities;
create trigger opportunities_protect_gate
  before update on public.opportunities
  for each row execute function public.protect_opportunity_gate();

notify pgrst, 'reload schema';
