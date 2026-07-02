-- Storage RLS for the 'nightout-media' bucket.
-- Depends on 0005 (users.auth_id) so the policy can tie an authenticated caller to a room.
-- storage.objects already ships with RLS enabled on Supabase; this statement is idempotent
-- and included to satisfy the "enable RLS on the storage objects table" requirement.
alter table storage.objects enable row level security;

-- INSERT: an authenticated user may upload only under the folder of an active room they
-- belong to. MediaUpload writes paths as `<ROOM_CODE>/<uuid>.jpg`, so the first path
-- segment must equal a room_code the caller is a member of.
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
