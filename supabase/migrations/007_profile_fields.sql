-- =============================================================================
-- 007_profile_fields.sql
-- Champs d'ÉDITION du profil (écran « Modifier le profil »). Additif, non destructif :
-- ajoute les colonnes si absentes. RLS existante (profiles_self_update, migration 004) suffit :
-- chacun ne met à jour que SON profil.
-- =============================================================================

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists username   text,
  add column if not exists bio        text,
  add column if not exists phone      text,
  add column if not exists city       text,
  add column if not exists website    text,
  add column if not exists cover_url  text;

-- Pseudo unique (optionnel, insensible à la casse) — seulement quand renseigné.
create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;
