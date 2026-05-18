
create or replace function public.auto_admin_seed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'j.seigler@csuohio.edu' then
    new.role := 'admin';
    new.approved := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_admin_seed on public.educators;
create trigger trg_auto_admin_seed
before insert on public.educators
for each row execute function public.auto_admin_seed();
