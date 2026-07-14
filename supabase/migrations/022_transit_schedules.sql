-- ============================================================================
-- 022_transit_schedules — horaires GTFS COMPLETS (Bus & Tram : prochains départs)
-- La 021 n'agrégeait que première/dernière course ; cette migration conserve les
-- horaires individuels. MINIMALE : trips, stop_times, calendar, calendar_dates.
-- Départs stockés en SECONDES depuis le début du jour de service (entier) :
-- gère nativement les courses GTFS > 24:00 (ex. 25:30:00 → 91800).
-- Séparation merchants intacte. Lecture publique, écriture service_role seule.
-- IDEMPOTENTE (if not exists / drop policy if exists).
-- ============================================================================

-- calendar : jours de circulation par service.
create table if not exists public.transit_services (
  id         bigint generated always as identity primary key,
  feed_id    bigint not null references public.transit_feeds (id) on delete cascade,
  service_id text not null,
  monday boolean not null, tuesday boolean not null, wednesday boolean not null,
  thursday boolean not null, friday boolean not null, saturday boolean not null,
  sunday boolean not null,
  start_date date not null,
  end_date   date not null,
  unique (feed_id, service_id)
);

-- calendar_dates : exceptions (1 = ajouté, 2 = retiré).
create table if not exists public.transit_service_exceptions (
  id             bigint generated always as identity primary key,
  feed_id        bigint not null references public.transit_feeds (id) on delete cascade,
  service_id     text not null,
  date           date not null,
  exception_type smallint not null check (exception_type in (1, 2)),
  unique (feed_id, service_id, date)
);
create index if not exists transit_service_exceptions_date_idx
  on public.transit_service_exceptions (feed_id, date);

-- trips : course → ligne + service + destination affichée.
create table if not exists public.transit_trips (
  id           bigint generated always as identity primary key,
  feed_id      bigint not null references public.transit_feeds (id) on delete cascade,
  trip_id      text not null,
  route_id     text not null,
  service_id   text not null,
  headsign     text,
  direction_id smallint,
  wheelchair_accessible smallint,            -- accessibilité PMR OFFICIELLE (champ GTFS)
  unique (feed_id, trip_id)
);
create index if not exists transit_trips_route_idx on public.transit_trips (feed_id, route_id);

-- stop_times : LE cœur — départ par arrêt et par course, en secondes (gère > 24:00).
create table if not exists public.transit_stop_times (
  id             bigint generated always as identity primary key,
  feed_id        bigint not null references public.transit_feeds (id) on delete cascade,
  trip_id        text not null,
  stop_id        text not null,
  stop_sequence  integer not null,
  departure_secs integer not null check (departure_secs >= 0 and departure_secs < 172800),
  unique (feed_id, trip_id, stop_sequence)
);
-- Index de la requête utilisateur : « prochains départs à CET arrêt ».
create index if not exists transit_stop_times_stop_idx
  on public.transit_stop_times (feed_id, stop_id, departure_secs);

-- RLS : lecture publique, aucune policy d'écriture (service_role bypass uniquement).
alter table public.transit_services enable row level security;
alter table public.transit_service_exceptions enable row level security;
alter table public.transit_trips enable row level security;
alter table public.transit_stop_times enable row level security;

drop policy if exists transit_services_public_read on public.transit_services;
create policy transit_services_public_read on public.transit_services for select using (true);
drop policy if exists transit_service_exceptions_public_read on public.transit_service_exceptions;
create policy transit_service_exceptions_public_read on public.transit_service_exceptions for select using (true);
drop policy if exists transit_trips_public_read on public.transit_trips;
create policy transit_trips_public_read on public.transit_trips for select using (true);
drop policy if exists transit_stop_times_public_read on public.transit_stop_times;
create policy transit_stop_times_public_read on public.transit_stop_times for select using (true);
