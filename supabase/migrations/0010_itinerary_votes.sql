-- One upvote per person per place. The old model just incremented upvotes_count with no
-- record of who voted, so anyone could spam a place. Track individual votes; the composite
-- primary key (suggestion_id, user_id) enforces the "one per person" rule. upvotes_count is
-- kept as a denormalized count of rows here.
create table itinerary_votes (
  suggestion_id uuid not null references itinerary_suggestions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);
create index itinerary_votes_suggestion_idx on itinerary_votes (suggestion_id);

-- Deny-all RLS, consistent with 0009 — the app reaches this table via the service-role client.
alter table itinerary_votes enable row level security;
