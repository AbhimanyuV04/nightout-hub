-- Harden the database API surface.
--
-- Every DB read/write in this app goes through the service-role client (server-side only),
-- which BYPASSES RLS. The browser/anon client is only ever used for Storage, Realtime
-- broadcast, and Auth — never for table reads. So we enable RLS on every app table with
-- NO permissive policies: this denies the public anon/authenticated roles any direct access
-- via Supabase's auto-generated REST API, while the app (service-role) keeps working.
--
-- The one place table data is read as the `authenticated` role is the storage upload policy
-- (0006), whose inline subquery over public.users/rooms would start returning nothing once
-- those tables get RLS. We route that check through a SECURITY DEFINER function instead, so
-- it runs as the table owner and doesn't depend on table policies.

-- 1) SECURITY DEFINER membership check for the storage policy (bypasses table RLS internally).
create or replace function public.is_active_room_member(p_room_code text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from users u
    join rooms r on r.id = u.room_id
    where u.auth_id = auth.uid()
      and r.is_active
      and r.room_code = p_room_code
  );
$$;

-- 2) Re-point the storage upload policy at the helper (replaces the inline subquery in 0006).
drop policy if exists "nightout media insert by room member" on storage.objects;
create policy "nightout media insert by room member"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'nightout-media'
  and public.is_active_room_member((storage.foldername(name))[1])
);

-- 3) Enable RLS on every app table. No policies = deny-all for anon/authenticated; the
--    service-role server client bypasses RLS and is unaffected.
alter table rooms                 enable row level security;
alter table users                 enable row level security;
alter table expenses              enable row level security;
alter table expense_splits        enable row level security;
alter table room_media            enable row level security;
alter table vibe_check            enable row level security;
alter table itinerary_suggestions enable row level security;
alter table quote_board           enable row level security;
alter table profiles              enable row level security;
