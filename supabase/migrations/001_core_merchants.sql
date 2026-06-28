-- =============================================================================
-- 001_core_merchants.sql
-- Base publique des commerces YOOTOO.
-- L'app publique (clé anon) ne doit voir QUE les commerces status = 'active'.
-- =============================================================================

-- Extension pour gen_random_uuid()
create extension if not exists pgcrypto;

-- Statuts du cycle de vie d'une fiche commerce
do $$
begin
  create type public.merchant_status as enum ('draft', 'pending_review', 'active', 'suspended');
exception
  when duplicate_object then null;
end
$$;

-- Table des fiches commerces (colonnes alignées sur le mapper de l'app)
create table if not exists public.merchants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text not null,
  description   text not null default '',
  latitude      double precision not null,
  longitude     double precision not null,
  distance_label text,
  is_open_now   boolean not null default false,
  is_producer   boolean not null default false,
  is_accessible boolean not null default false,
  has_rewards   boolean not null default false,
  eco_score     integer not null default 0,
  pin_x         real,
  pin_y         real,
  status        public.merchant_status not null default 'draft',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index de base
create index if not exists merchants_status_idx on public.merchants (status);

-- updated_at automatique
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists merchants_set_updated_at on public.merchants;
create trigger merchants_set_updated_at
  before update on public.merchants
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.merchants enable row level security;

-- Lecture publique UNIQUEMENT des commerces actifs (anon + authenticated)
drop policy if exists merchants_public_read_active on public.merchants;
create policy merchants_public_read_active on public.merchants
  for select
  to anon, authenticated
  using (status = 'active');

-- NB : aucune policy insert/update/delete ici → écritures impossibles côté client.
-- L'accès commerçant (lecture/édition de ses fiches) est ajouté en 002_merchant_access.sql.
