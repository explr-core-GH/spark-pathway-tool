-- Curriculum storage bucket
--
-- Public read so the Microsoft Office Online viewer can fetch the URL
-- without auth (it iframes the file from view.officeapps.live.com).
-- Admin-only write — uploads happen through /educator/admin/camps and
-- are gated on is_admin(auth.uid()).
--
-- File layout in the bucket:
--   curriculum/<camp_slug>/<filename.pptx>
--
-- The camps.slides column stores just the filename; the SlideViewer
-- composes the full public URL at render time.

insert into storage.buckets (id, name, public)
values ('curriculum', 'curriculum', true)
on conflict (id) do update set public = excluded.public;

-- Read: anyone (so Office Online viewer can fetch).
drop policy if exists "curriculum public read" on storage.objects;
create policy "curriculum public read"
  on storage.objects for select
  using (bucket_id = 'curriculum');

-- Write/update/delete: admins only. is_admin() lives in public and reads
-- public.admins (via the split-admins migration).
drop policy if exists "curriculum admin write" on storage.objects;
create policy "curriculum admin write"
  on storage.objects for insert
  with check (bucket_id = 'curriculum' and public.is_admin(auth.uid()));

drop policy if exists "curriculum admin update" on storage.objects;
create policy "curriculum admin update"
  on storage.objects for update
  using (bucket_id = 'curriculum' and public.is_admin(auth.uid()))
  with check (bucket_id = 'curriculum' and public.is_admin(auth.uid()));

drop policy if exists "curriculum admin delete" on storage.objects;
create policy "curriculum admin delete"
  on storage.objects for delete
  using (bucket_id = 'curriculum' and public.is_admin(auth.uid()));
