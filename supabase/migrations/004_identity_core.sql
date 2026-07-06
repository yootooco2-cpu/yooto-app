-- =============================================================================
-- 004_identity_core.sql
-- Identity Engine — couche PERSONNE (profiles) + rôles PLATEFORME (user_roles).
--
-- S'intègre au schéma existant SANS le dupliquer :
--   • merchants        = entités « Maison » (type commerçant)  [001]
--   • merchant_users   = appartenance personne ↔ Maison (owner/manager/staff)  [002]
--   • merchant_claims  = revendication  [003]
-- Ici on ajoute uniquement l'ANCRE « personne » et les rôles GLOBAUX.
--
-- Invariants (cf. docs/auth/IDENTITY_ENGINE.md) :
--   • profiles.id = auth.uid  → policies RLS simples, tout en restant fusionnable
--     (les tables métier référencent profiles.id, ici = auth.users.id).
--   • deny by default : aucune écriture cliente sensible ; création via trigger,
--     octroi de rôle via flux SECURITY DEFINER / admin (jamais service_role au client).
-- Dépend de : 001_core_merchants.sql (extension pgcrypto, set_updated_at()).
-- INERTE tant qu'aucun utilisateur n'est connecté (Auth activée côté dashboard).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PROFILES — 1:1 avec auth.users (la personne, ancre stable)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text,
  avatar_url              text,
  locale                  text not null default 'fr',
  primary_email           text,
  marketing_consent       boolean not null default false,
  onboarding_completed_at timestamptz,
  status                  text not null default 'active'
                            check (status in ('active', 'merged', 'deleted')),
  merged_into             uuid references public.profiles (id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- updated_at automatique (réutilise le helper de 001)
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- USER_ROLES — rôles PLATEFORME, many-to-many (une personne peut cumuler)
--   Types métier (commerçant/producteur/collectivité) = entités + appartenance,
--   PAS des rôles ici (cf. merchant_users). Ici : rôles transverses.
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('individual', 'ambassador', 'admin')),
  granted_by uuid references public.profiles (id),
  granted_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create index if not exists user_roles_profile_idx on public.user_roles (profile_id);

-- Helper de rôle (SECURITY DEFINER + search_path verrouillé → pas de récursion RLS).
create or replace function public.has_role(r text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.profile_id = auth.uid() and ur.role = r
  );
$$;

-- -----------------------------------------------------------------------------
-- TRIGGER — à la création d'un auth.users : créer le profil + rôle par défaut.
--   SECURITY DEFINER : s'exécute avec les droits nécessaires (auth.users → public).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, primary_email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      nullif(trim(concat_ws(' ',
        new.raw_user_meta_data ->> 'first_name',
        new.raw_user_meta_data ->> 'last_name')), ''),
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (id) do nothing;

  insert into public.user_roles (profile_id, role)
  values (new.id, 'individual')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles   enable row level security;
alter table public.user_roles enable row level security;

-- La personne lit et met à jour SON profil (jamais un autre).
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
-- NB : pas de policy INSERT/DELETE cliente → création par trigger, suppression = flux RGPD/admin.

-- La personne lit SES rôles (pour l'UI). Octroi = flux SECURITY DEFINER / admin.
drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
  for select to authenticated
  using (profile_id = auth.uid());
-- NB : aucune policy INSERT/UPDATE/DELETE cliente → pas d'auto-attribution de rôle.
