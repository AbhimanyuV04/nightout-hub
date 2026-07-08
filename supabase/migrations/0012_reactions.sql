-- Emoji reactions on photos and quotes. One row per (target, user, emoji); tapping the same
-- emoji again deletes the row (toggle). target_id is not a FK (it points at two tables);
-- cleanup rides the room_id / user_id cascades instead.
create table reactions (
  room_id uuid not null references rooms(id) on delete cascade,
  target_type text not null check (target_type in ('media', 'quote')),
  target_id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (target_type, target_id, user_id, emoji)
);
create index reactions_room_idx on reactions (room_id);

-- Deny-all RLS, consistent with 0009 — the app reaches this table via the service-role client.
alter table reactions enable row level security;
