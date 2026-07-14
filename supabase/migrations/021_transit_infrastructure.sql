-- ============================================================================
-- 021_transit_infrastructure — infrastructure transport (GO fondateur 14/07)
-- Séparation STRICTE d'avec les commerces :
--   commerces                   → public.merchants (AUCUNE référence ici, dans les deux sens)
--   arrêts / lignes / desserte  → transit_* (source GTFS officielle uniquement)
--   vélos/trottinettes partagés → gbfs_*  (source GBFS officielle uniquement)
--   temps réel (GTFS-RT)        → JAMAIS persisté (proxy court ; aucune table)
-- Écriture : service_role uniquement (pipelines n8n) — aucune policy d'écriture.
-- Lecture  : publique (l'app consomme, comme les merchants actifs).
-- IDEMPOTENTE : rejouable sans effet (if not exists / drop policy if exists).
-- ============================================================================

-- Flux sources, résolus via transport.data.gouv.fr (point d'accès national officiel).
create table if not exists public.transit_feeds (
  id            bigint generated always as identity primary key,
  network       text not null,                      -- 'TaM', 'liO', 'Alesy', 'Sète Agglopole'…
  kind          text not null check (kind in ('gtfs', 'gbfs')),  -- pas de 'gtfs-rt' : jamais persisté
  dataset_title text not null,
  resource_url  text not null unique,
  fetched_at    timestamptz,
  feed_version  text,
  created_at    timestamptz not null default now()
);

-- Arrêts (GTFS stops).
create table if not exists public.transit_stops (
  id            bigint generated always as identity primary key,
  feed_id       bigint not null references public.transit_feeds (id) on delete cascade,
  stop_id       text not null,
  name          text not null,
  latitude      double precision not null check (latitude between -90 and 90),
  longitude     double precision not null check (longitude between -180 and 180),
  location_type smallint,
  wheelchair_boarding smallint,                     -- accessibilité SOURCÉE (champ GTFS), jamais inventée
  unique (feed_id, stop_id)
);
create index if not exists transit_stops_geo_idx on public.transit_stops (latitude, longitude);
create index if not exists transit_stops_feed_idx on public.transit_stops (feed_id);

-- Lignes (GTFS routes) : tram, bus…
create table if not exists public.transit_routes (
  id         bigint generated always as identity primary key,
  feed_id    bigint not null references public.transit_feeds (id) on delete cascade,
  route_id   text not null,
  short_name text,
  long_name  text,
  route_type smallint not null,                     -- 0 tram, 3 bus… (spécification GTFS)
  color      text,
  unique (feed_id, route_id)
);
create index if not exists transit_routes_feed_idx on public.transit_routes (feed_id);

-- Desserte agrégée par arrêt (dérivée de trips/stop_times ; on ne stocke JAMAIS le
-- stop_times brut — volumétrie maîtrisée : lignes × arrêt × plage × jours).
create table if not exists public.transit_stop_services (
  id              bigint generated always as identity primary key,
  stop_pk         bigint not null references public.transit_stops (id) on delete cascade,
  route_pk        bigint not null references public.transit_routes (id) on delete cascade,
  direction       text not null default '',
  first_departure time,
  last_departure  time,
  weekday_mask    smallint not null default 127 check (weekday_mask between 1 and 127),
  unique (stop_pk, route_pk, direction, weekday_mask)
);
create index if not exists transit_stop_services_stop_idx on public.transit_stop_services (stop_pk);
create index if not exists transit_stop_services_route_idx on public.transit_stop_services (route_pk);

-- GBFS — systèmes de vélos/trottinettes partagés (Vélomagg, NemoVélo).
create table if not exists public.gbfs_systems (
  id        bigint generated always as identity primary key,
  feed_id   bigint not null references public.transit_feeds (id) on delete cascade,
  system_id text not null,
  name      text not null,
  unique (feed_id, system_id)
);

create table if not exists public.gbfs_stations (
  id         bigint generated always as identity primary key,
  system_pk  bigint not null references public.gbfs_systems (id) on delete cascade,
  station_id text not null,
  name       text not null,
  latitude   double precision not null check (latitude between -90 and 90),
  longitude  double precision not null check (longitude between -180 and 180),
  capacity   integer check (capacity is null or capacity >= 0),
  unique (system_pk, station_id)
);
create index if not exists gbfs_stations_system_idx on public.gbfs_stations (system_pk);
create index if not exists gbfs_stations_geo_idx on public.gbfs_stations (latitude, longitude);

-- Disponibilité : DERNIER relevé uniquement (upsert par station — aucun historique).
create table if not exists public.gbfs_station_status (
  station_pk      bigint primary key references public.gbfs_stations (id) on delete cascade,
  bikes_available integer check (bikes_available is null or bikes_available >= 0),
  docks_available integer check (docks_available is null or docks_available >= 0),
  is_renting      boolean,
  reported_at     timestamptz not null
);

-- RLS : lecture publique, AUCUNE policy d'écriture (service_role bypass uniquement).
alter table public.transit_feeds enable row level security;
alter table public.transit_stops enable row level security;
alter table public.transit_routes enable row level security;
alter table public.transit_stop_services enable row level security;
alter table public.gbfs_systems enable row level security;
alter table public.gbfs_stations enable row level security;
alter table public.gbfs_station_status enable row level security;

drop policy if exists transit_feeds_public_read on public.transit_feeds;
create policy transit_feeds_public_read on public.transit_feeds for select using (true);
drop policy if exists transit_stops_public_read on public.transit_stops;
create policy transit_stops_public_read on public.transit_stops for select using (true);
drop policy if exists transit_routes_public_read on public.transit_routes;
create policy transit_routes_public_read on public.transit_routes for select using (true);
drop policy if exists transit_stop_services_public_read on public.transit_stop_services;
create policy transit_stop_services_public_read on public.transit_stop_services for select using (true);
drop policy if exists gbfs_systems_public_read on public.gbfs_systems;
create policy gbfs_systems_public_read on public.gbfs_systems for select using (true);
drop policy if exists gbfs_stations_public_read on public.gbfs_stations;
create policy gbfs_stations_public_read on public.gbfs_stations for select using (true);
drop policy if exists gbfs_station_status_public_read on public.gbfs_station_status;
create policy gbfs_station_status_public_read on public.gbfs_station_status for select using (true);
