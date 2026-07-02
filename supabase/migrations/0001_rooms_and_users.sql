create table rooms (
  id uuid primary key default gen_random_uuid(),
  room_code char(6) not null unique check (room_code ~ '^[A-Z0-9]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 40),
  is_host boolean not null default false,
  joined_at timestamptz not null default now()
);

create unique index one_host_per_room on users (room_id) where is_host;
create index users_room_id_idx on users (room_id);
