-- Create a public storage bucket named 'nightout-media' in the Supabase dashboard.

create table room_media (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index room_media_room_id_created_at_idx on room_media (room_id, created_at desc);
