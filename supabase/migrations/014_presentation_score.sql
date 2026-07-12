-- DÉCISION PRODUIT 12/07 — SCORE DE COMPLÉTUDE : DÉRIVÉ · RECALCULÉ AUTO · MATÉRIALISÉ.
--
-- GÉNÉRATED COLUMN (STORED) : le score n'est JAMAIS saisi ni mis à jour à la main —
-- Postgres le recalcule lui-même à chaque écriture de la ligne. C'est un cache dérivé
-- auto-invalidé par construction : il ne PEUT pas se désynchroniser du contenu (Loi 7).
-- Le tri (carte, listes, futures requêtes ORDER BY) le lit sans recalcul applicatif.
--
-- ⚠ CE SCORE N'EST JAMAIS UNE NOTE DE QUALITÉ. Il ordonne l'affichage, rien d'autre.
-- Côté commerçant il ne s'affiche JAMAIS en chiffre : uniquement une liste d'actions
-- (« ajoutez vos horaires… ») — voir CONSTITUTION.md ch.10 et presentation.ts.
--
-- Pondérations validées : photo 3 · vérifié SIRENE 3 · téléphone 2 · note 2 · horaires 1 · site 1.
-- Nuance client : la part « photo » est raffinée à l'affichage par la santé de chargement
-- réelle (registre onError) — la colonne porte la part dérivable des données.
-- Rollback : ALTER TABLE merchants DROP COLUMN presentation_score;

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS presentation_score smallint GENERATED ALWAYS AS (
    (CASE WHEN COALESCE(photo_url, cover_photo_url) IS NOT NULL THEN 3 ELSE 0 END)
    + (CASE WHEN siret IS NOT NULL AND sirene_etat = 'A' THEN 3 ELSE 0 END)
    + (CASE WHEN NULLIF(phone, '') IS NOT NULL THEN 2 ELSE 0 END)
    + (CASE WHEN google_rating IS NOT NULL AND google_rating > 0 THEN 2 ELSE 0 END)
    + (CASE WHEN opening_hours IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN NULLIF(website, '') IS NOT NULL THEN 1 ELSE 0 END)
  ) STORED;

COMMENT ON COLUMN public.merchants.presentation_score IS
  'Score de complétude DÉRIVÉ (generated column — jamais saisi, auto-recalculé). Ordre d''affichage uniquement : JAMAIS une note de qualité, jamais affiché en chiffre au commerçant.';
