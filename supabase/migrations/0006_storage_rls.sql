-- Storage RLS for the 'nightout-media' bucket.
-- Depends on 0005 (users.auth_id) so the policy can tie an authenticated caller to a room.
--
-- Note: RLS is already enabled on storage.objects in every Supabase project, and that table
-- is owned by supabase_storage_admin — so `alter table storage.objects enable row level
-- security` run as postgres fails with "must be owner of table objects" (42501). We don't
-- need it; CREATE POLICY below is permitted from the SQL editor.

-- INSERT: an authenticated user may upload only under the folder of an active room they
-- belong to. MediaUpload writes paths as `<ROOM_CODE>/<uuid>.jpg`, so the first path
-- segment must equal a room_code the caller is a member of.
drop policy if exists "nightout media insert by room member" on storage.objects;
create policy "nightout media insert by room member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'nightout-media'
  and exists (
    select 1
    from public.users u
    join public.rooms r on r.id = u.room_id
    where u.auth_id = auth.uid()
      and r.is_active
      and r.room_code = (storage.foldername(name))[1]
  )
);
