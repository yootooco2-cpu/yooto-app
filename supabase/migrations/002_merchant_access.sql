-- =============================================================================
-- 002_merchant_access.sql
-- Accès commerçant : liaison auth.users <-> merchants + RLS d'édition.
-- Inerte tant qu'aucun utilisateur n'est connecté (Auth activée plus tard).
-- Sécurité : personne ne peut s'auto-attribuer un commerce (pas d'insert client).
-- Dépend de : 001_core_merchants.sql
-- =============================================================================

-- Liaison utilisateur <-> commerce, avec rôle
create table if not exists public.merchant_users (
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner', 'manager', 'staff')),
  created_at  timestamptz not null default now(),
  primary key (merchant_id, user_id)
);

create index if not exists merchant_users_user_idx on public.merchant_users (user_id);

-- Helper d'appartenance.
-- SECURITY DEFINER + search_path verrouillé : évite la récursion RLS entre
-- merchants (qui appelle ce helper) et merchant_users (qui a sa propre RLS).
create or replace function public.is_merchant_member(mid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.merchant_users mu
    where mu.merchant_id = mid
      and mu.user_id = auth.uid()
  );
$$;

-- RLS
alter table public.merchant_users enable row level security;

-- Un commerçant connecté voit UNIQUEMENT ses propres liaisons
drop policy if exists merchant_users_self_read on public.merchant_users;
create policy merchant_users_self_read on public.merchant_users
  for select
  to authenticated
  using (user_id = auth.uid());

-- Un membre lié peut lire SA fiche même si elle n'est pas active (édition de drafts)
drop policy if exists merchants_member_read_own on public.merchants;
create policy merchants_member_read_own on public.merchants
  for select
  to authenticated
  using (public.is_merchant_member(id));

-- Un membre lié peut MODIFIER sa fiche
drop policy if exists merchants_member_update on public.merchants;
create policy merchants_member_update on public.merchants
  for update
  to authenticated
  using (public.is_merchant_member(id))
  with check (public.is_merchant_member(id));

-- NB volontaire :
--  • AUCUNE policy insert/delete sur merchant_users  → pas d'auto-attribution.
--  • AUCUNE policy insert/delete sur merchants côté client.
--  • Création de fiche, revendication, validation admin = flux SECURITY DEFINER / admin
--    (003_merchant_claims.sql et suivants). Jamais de service_role dans le bundle.
