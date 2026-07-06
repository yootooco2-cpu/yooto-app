-- =============================================================================
-- 005_favorites.sql
-- Favoris utilisateur — 1er client du "User Data Store" (cf. ADR-001).
-- Modele LWW-element-set : (profile_id, merchant_id) + state + client_updated_at.
--   • PK (profile_id, merchant_id) → ZERO duplication.
--   • RPC set_favorite (SECURITY INVOKER, RLS appliquee) → LWW cote serveur,
--     idempotent, convergence multi-appareils. "active gagne a egalite" (Zero-Loss).
-- Depend de : 001 (set_updated_at, merchants), 004 (profiles).
-- INERTE tant qu'aucun utilisateur (anonyme ou lie).
-- =============================================================================

create table if not exists public.favorites (
  profile_id        uuid not null references public.profiles (id)  on delete cascade,
  -- merchant_id: BIGINT pour référencer public.merchants(id) (type réel importé = bigint).
  merchant_id       bigint not null references public.merchants (id) on delete cascade,
  state             text not null default 'active' check (state in ('active', 'removed')),
  client_updated_at timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (profile_id, merchant_id)
);

create index if not exists favorites_active_idx
  on public.favorites (profile_id) where state = 'active';

drop trigger if exists favorites_set_updated_at on public.favorites;
create trigger favorites_set_updated_at
  before update on public.favorites
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS : chacun ne voit et n'ecrit QUE ses favoris.
-- -----------------------------------------------------------------------------
alter table public.favorites enable row level security;

drop policy if exists favorites_self_read on public.favorites;
create policy favorites_self_read on public.favorites
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists favorites_self_insert on public.favorites;
create policy favorites_self_insert on public.favorites
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists favorites_self_update on public.favorites;
create policy favorites_self_update on public.favorites
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- -----------------------------------------------------------------------------
-- RPC LWW (SECURITY INVOKER → RLS s'applique, l'utilisateur ne touche que ses lignes).
-- -----------------------------------------------------------------------------
create or replace function public.set_favorite(
  p_merchant bigint,
  p_state    text,
  p_client_ts timestamptz
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_state not in ('active', 'removed') then
    raise exception 'invalid state %', p_state;
  end if;

  insert into public.favorites (profile_id, merchant_id, state, client_updated_at)
  values (auth.uid(), p_merchant, p_state, p_client_ts)
  on conflict (profile_id, merchant_id) do update
    set state = excluded.state,
        client_updated_at = excluded.client_updated_at,
        updated_at = now()
    where excluded.client_updated_at > public.favorites.client_updated_at
       or (excluded.client_updated_at = public.favorites.client_updated_at
           and excluded.state = 'active');   -- ★ active gagne a egalite (Zero-Loss)
end;
$$;
