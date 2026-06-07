-- Per-question context photos for the RIASEC assessment.
--
-- Admins upload one photo per item; the file lands in the public
-- "assessment-photos" bucket and the resolved URL is recorded in
-- assessment_item_photos (item_id → url). The assessment runner reads
-- the map and shows the photo above each prompt; items without a photo
-- fall back to the dimension-colored band.

-- Bucket: public read (students load photos), admin write.
insert into storage.buckets (id, name, public)
values ('assessment-photos', 'assessment-photos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "assessment-photos public read" on storage.objects;
create policy "assessment-photos public read"
  on storage.objects for select
  using (bucket_id = 'assessment-photos');

drop policy if exists "assessment-photos admin write" on storage.objects;
create policy "assessment-photos admin write"
  on storage.objects for insert
  with check (bucket_id = 'assessment-photos' and public.is_admin(auth.uid()));

drop policy if exists "assessment-photos admin update" on storage.objects;
create policy "assessment-photos admin update"
  on storage.objects for update
  using (bucket_id = 'assessment-photos' and public.is_admin(auth.uid()))
  with check (bucket_id = 'assessment-photos' and public.is_admin(auth.uid()));

drop policy if exists "assessment-photos admin delete" on storage.objects;
create policy "assessment-photos admin delete"
  on storage.objects for delete
  using (bucket_id = 'assessment-photos' and public.is_admin(auth.uid()));

-- item_id → photo URL map.
create table if not exists public.assessment_item_photos (
  item_id text primary key,
  url text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table public.assessment_item_photos enable row level security;

-- Anyone signed in can read (students need the photos during the test).
drop policy if exists "assessment_item_photos read" on public.assessment_item_photos;
create policy "assessment_item_photos read" on public.assessment_item_photos
  for select using (auth.uid() is not null);

drop policy if exists "assessment_item_photos admin write" on public.assessment_item_photos;
create policy "assessment_item_photos admin write" on public.assessment_item_photos
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

notify pgrst, 'reload schema';
