-- =============================================================================
-- 006_profile_from_oauth.sql
-- MVP Authentification — enrichit la création automatique de profil à partir des
-- métadonnées OAuth (Google / Apple) : on capte aussi la PHOTO (avatar) et on
-- consolide le nom et l'email. Étapes 4 & 7 du scénario MVP (profil auto complet).
--
-- `create or replace function` : idempotent, met simplement à jour le corps du trigger
-- défini en 004 (aucune nouvelle table, aucune policy modifiée). Dépend de :
--   • 004_identity_core.sql (table profiles + trigger on_auth_user_created).
-- INERTE tant qu'aucun utilisateur ne se connecte.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, primary_email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, new.raw_user_meta_data ->> 'email'),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      nullif(trim(concat_ws(' ',
        coalesce(new.raw_user_meta_data ->> 'given_name', new.raw_user_meta_data ->> 'first_name'),
        coalesce(new.raw_user_meta_data ->> 'family_name', new.raw_user_meta_data ->> 'last_name'))), '')
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;

  insert into public.user_roles (profile_id, role)
  values (new.id, 'individual')
  on conflict do nothing;

  return new;
end;
$$;
