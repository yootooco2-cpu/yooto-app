-- =============================================================================
-- 003_merchant_claims.sql
-- Revendication d'un commerce existant par un professionnel.
-- Un utilisateur connecté DEMANDE ; l'APPROBATION (admin) viendra plus tard
-- via une RPC SECURITY DEFINER / back-office. Aucun service_role côté client.
-- Dépend de : 001_core_merchants.sql, 002_merchant_access.sql
-- =============================================================================

-- Statuts d'une demande de revendication
do $$
begin
  create type public.claim_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end
$$;

-- Table des demandes de revendication
create table if not exists public.merchant_claims (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  status      public.claim_status not null default 'pending',
  message     text,
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Une seule demande par (commerce, utilisateur)
  unique (merchant_id, user_id)
);

create index if not exists merchant_claims_user_idx on public.merchant_claims (user_id);
create index if not exists merchant_claims_merchant_idx on public.merchant_claims (merchant_id);
create index if not exists merchant_claims_status_idx on public.merchant_claims (status);

-- updated_at automatique (réutilise public.set_updated_at de 001)
drop trigger if exists merchant_claims_set_updated_at on public.merchant_claims;
create trigger merchant_claims_set_updated_at
  before update on public.merchant_claims
  for each row
  execute function public.set_updated_at();

-- RLS
alter table public.merchant_claims enable row level security;

-- SELECT : un utilisateur ne voit QUE ses propres demandes
drop policy if exists merchant_claims_self_read on public.merchant_claims;
create policy merchant_claims_self_read on public.merchant_claims
  for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT : un utilisateur ne peut créer une demande QUE pour lui-même, en 'pending'
-- (impossible de se l'auto-approuver : status forcé à 'pending').
drop policy if exists merchant_claims_self_insert on public.merchant_claims;
create policy merchant_claims_self_insert on public.merchant_claims
  for insert
  to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- NB volontaire :
--  • AUCUNE policy UPDATE côté client → impossible de changer status/admin_note soi-même.
--  • AUCUNE policy DELETE côté client.
--  • approve/reject = RPC SECURITY DEFINER + rôle admin (migration ultérieure).
--    Cette RPC mettra status='approved' ET créera la liaison merchant_users (owner).
--  • Jamais de service_role dans le bundle.
