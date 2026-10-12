-- Passport picture: an emoji (any grade) or an uploaded photo (grades 9-12).
--
-- Photos live in a public bucket under the student's own folder so a
-- student can only write their own picture; the URL is unguessable
-- (uuid folder + random file name). Grades 4-8 stay anonymous and only
-- get the emoji option in the UI.

alter table public.students add column if not exists avatar_emoji text;
alter table public.students add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-photos',
  'student-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "student photos public read" on storage.objects;
create policy "student photos public read" on storage.objects
  for select using (bucket_id = 'student-photos');

drop policy if exists "student photos own write" on storage.objects;
create policy "student photos own write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'student-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "student photos own update" on storage.objects;
create policy "student photos own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "student photos own delete" on storage.objects;
create policy "student photos own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
