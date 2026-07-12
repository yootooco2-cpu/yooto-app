-- OBJECTIF STRATÉGIQUE 10 000 (décision 12/07) — TABLEAU DE BORD PERMANENT.
-- Niveaux de richesse du CATALOGUE (dérivés, jamais saisis — mêmes garanties que 014) :
--   PREMIUM  : photo + horaires + téléphone + adresse + catégorie fiable + note + avis
--              (site web bienvenu mais JAMAIS requis)
--   RICHE    : ≥ 5 informations fiables
--   STANDARD : ≥ 3 informations fiables
--   MINIMAL  : le reste — dont les vérifiés SIRENE nus, qui RESTENT PUBLIÉS :
--              le niveau priorise l'acquisition/affichage/commercial, jamais la visibilité.
-- Rollback : DROP VIEW objectif_10000; DROP VIEW catalogue_niveaux;

CREATE OR REPLACE VIEW public.catalogue_niveaux AS
SELECT
  id, name, status,
  (siret IS NOT NULL AND sirene_etat = 'A') AS verifie,
  (
    (COALESCE(photo_url, cover_photo_url) IS NOT NULL)::int
    + (opening_hours IS NOT NULL)::int
    + (NULLIF(phone, '') IS NOT NULL)::int
    + (NULLIF(website, '') IS NOT NULL)::int
    + (NULLIF(address, '') IS NOT NULL)::int
    + (NULLIF(category, '') IS NOT NULL AND category NOT IN ('establishment','point_of_interest','store','food'))::int
    + (google_rating IS NOT NULL AND google_rating > 0)::int
    + (COALESCE(reviews_count, review_count, 0) > 0)::int
  ) AS infos_fiables,
  CASE
    WHEN COALESCE(photo_url, cover_photo_url) IS NOT NULL
     AND opening_hours IS NOT NULL
     AND NULLIF(phone, '') IS NOT NULL
     AND NULLIF(address, '') IS NOT NULL
     AND NULLIF(category, '') IS NOT NULL AND category NOT IN ('establishment','point_of_interest','store','food')
     AND google_rating IS NOT NULL AND google_rating > 0
     AND COALESCE(reviews_count, review_count, 0) > 0
    THEN 'PREMIUM'
    WHEN (
      (COALESCE(photo_url, cover_photo_url) IS NOT NULL)::int
      + (opening_hours IS NOT NULL)::int
      + (NULLIF(phone, '') IS NOT NULL)::int
      + (NULLIF(website, '') IS NOT NULL)::int
      + (NULLIF(address, '') IS NOT NULL)::int
      + (NULLIF(category, '') IS NOT NULL AND category NOT IN ('establishment','point_of_interest','store','food'))::int
      + (google_rating IS NOT NULL AND google_rating > 0)::int
      + (COALESCE(reviews_count, review_count, 0) > 0)::int
    ) >= 5 THEN 'RICHE'
    WHEN (
      (COALESCE(photo_url, cover_photo_url) IS NOT NULL)::int
      + (opening_hours IS NOT NULL)::int
      + (NULLIF(phone, '') IS NOT NULL)::int
      + (NULLIF(website, '') IS NOT NULL)::int
      + (NULLIF(address, '') IS NOT NULL)::int
      + (NULLIF(category, '') IS NOT NULL AND category NOT IN ('establishment','point_of_interest','store','food'))::int
      + (google_rating IS NOT NULL AND google_rating > 0)::int
      + (COALESCE(reviews_count, review_count, 0) > 0)::int
    ) >= 3 THEN 'STANDARD'
    ELSE 'MINIMAL'
  END AS niveau
FROM public.merchants;

CREATE OR REPLACE VIEW public.objectif_10000 AS
SELECT metric, value FROM (
  SELECT 'objectif' AS metric, 10000 AS value, 0 AS ord
  UNION ALL SELECT 'total', COUNT(*), 1 FROM merchants
  UNION ALL SELECT 'publies', COUNT(*) FILTER (WHERE status = 'active'), 2 FROM merchants
  UNION ALL SELECT 'verifies_sirene', COUNT(*) FILTER (WHERE siret IS NOT NULL AND sirene_etat = 'A'), 3 FROM merchants
  UNION ALL SELECT 'premium', COUNT(*) FILTER (WHERE niveau = 'PREMIUM'), 4 FROM catalogue_niveaux
  UNION ALL SELECT 'riches', COUNT(*) FILTER (WHERE niveau = 'RICHE'), 5 FROM catalogue_niveaux
  UNION ALL SELECT 'standard', COUNT(*) FILTER (WHERE niveau = 'STANDARD'), 6 FROM catalogue_niveaux
  UNION ALL SELECT 'minimal', COUNT(*) FILTER (WHERE niveau = 'MINIMAL'), 7 FROM catalogue_niveaux
  UNION ALL SELECT 'taux_completude_pct', ROUND(AVG(presentation_score) * 100.0 / 12), 8 FROM merchants
  UNION ALL SELECT 'fermes_encore_actifs', COUNT(*) FILTER (WHERE sirene_etat = 'F' AND status = 'active'), 9 FROM merchants
  UNION ALL SELECT 'acquisitions_7_jours', COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days'), 10 FROM merchants
  UNION ALL SELECT 'acquisitions_aujourdhui', COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())), 11 FROM merchants
) t ORDER BY ord;

COMMENT ON VIEW public.objectif_10000 IS
  'Tableau de bord OBJECTIF 10 000 commerces qualifiés. Les niveaux priorisent acquisition/affichage/commercial — jamais la visibilité (un vérifié minimal reste publié). Doublons/fermetures/quarantaines détaillés : files du pipeline (journaux d''acquisition).';
