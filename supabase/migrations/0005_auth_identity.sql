-- Google OAuth identity. Every room membership now belongs to a Supabase Auth user.
-- auth_id is the permanent, unique per-person UUID (auth.users.id); display_name is
-- seeded from the verified Google profile name. We keep this on `users` (rather than a
-- separate profiles table) so expenses / expense_splits / room_media that already FK to
-- users(id) need no change — a `users` row stays "this person's membership of this room".

alter table users
  add column if not exists auth_id uuid references auth.users(id) on delete cascade;

-- One membership per person per room (also lets joinRoom be idempotent via 23505).
create unique index if not exists users_room_auth_idx on users (room_id, auth_id);
