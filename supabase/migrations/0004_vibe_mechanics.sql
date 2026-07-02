create table vibe_check (
  room_id uuid primary key references rooms(id) on delete cascade,
  dress_code text,
  event_date timestamptz,
  updated_at timestamptz not null default now()
);

create table itinerary_suggestions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  created_by_user_id uuid not null references users(id) on delete cascade,
  place_name text not null check (length(place_name) between 1 and 120),
  upvotes_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table quote_board (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  submitted_by_user_id uuid not null references users(id) on delete cascade,
  quote_text text not null check (length(quote_text) between 1 and 500),
  speaker_name text not null check (length(speaker_name) between 1 and 80),
  created_at timestamptz not null default now()
);

create index itinerary_room_id_idx on itinerary_suggestions (room_id, upvotes_count desc);
create index quote_room_id_idx on quote_board (room_id, created_at desc);
