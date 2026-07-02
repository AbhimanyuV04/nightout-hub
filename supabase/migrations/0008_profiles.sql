-- Global user profile. nickname is the default display name used when joining/creating a
-- night (falls back to the Google profile name if unset). Per-night overrides still live on
-- users.display_name.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text check (nickname is null or length(nickname) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
