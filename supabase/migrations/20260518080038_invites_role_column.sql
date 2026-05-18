-- educator_invites: add a role column so admins and educators share one
-- invite system. Default 'educator' so existing rows keep working unchanged.
-- program_type stays required for educator invites; for admin invites it
-- can be any value (the acceptance flow ignores it and sets role='admin').

alter table public.educator_invites
  add column if not exists role text not null default 'educator'
    check (role in ('educator', 'admin'));

create index if not exists idx_educator_invites_role on public.educator_invites(role);

notify pgrst, 'reload schema';
