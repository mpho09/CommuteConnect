-- Search helpers (#24).

-- Great-circle distance in km (haversine). Enough for corridor-scale search;
-- switch to PostGIS geography + GiST when search needs to scale (PRD §10.5).
create function private.distance_km(
  lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric
) returns double precision
language sql immutable parallel safe set search_path = '' as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians((lat2 - lat1)::double precision) / 2), 2)
    + cos(radians(lat1::double precision)) * cos(radians(lat2::double precision))
      * power(sin(radians((lng2 - lng1)::double precision) / 2), 2)
  ))
$$;

revoke all on function private.distance_km(numeric, numeric, numeric, numeric) from public;

-- Place lookup by name for the built-in places provider
create index locations_public_label_idx on public.locations (lower(label)) where not is_private;

-- Search filters on journey listings and route freshness
create index journeys_listed_idx on public.journeys (journey_type, departure_at)
  where status = 'open' and seats_available > 0;
