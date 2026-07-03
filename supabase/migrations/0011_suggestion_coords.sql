-- Store the picked place's coordinates. Open-source routing (OSRM) needs coordinates to
-- compute time/distance — unlike Google Distance Matrix, which geocoded free-text names.
-- Nullable: free-text suggestions without a picked place just won't show a distance.
alter table itinerary_suggestions
  add column if not exists lat double precision,
  add column if not exists lng double precision;
