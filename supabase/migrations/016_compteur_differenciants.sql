-- COMPTEUR DE DIFFÉRENCIANTS (décision 12/07) — affiché à côté du 10 000 brut.
-- Le volume riche ne doit jamais masquer la part différenciante (Loi 1 ; anti-pattern
-- « le chant du volume facile », ch.10). Un différenciant = une PREUVE POSITIVE en base,
-- jamais une impression :
--   · ESS (est_ess) — coopératives, structures de l'économie sociale
--   · bio (est_bio) — certification
--   · artisan au Répertoire des Métiers (artisan_rm)
--   · production : NAF 01.x (culture/élevage), 03.x (pêche), 11.02 (vinification)
--   · marchés & éventaires : NAF 47.8x
--   · accueil du public prouvé par le Pipeline B (source = sirene_first_pipeline_b)
-- Le compteur OBSERVE la part différenciante ; il n'exclut, ne masque, ne note jamais
-- (Loi 3 — le niveau de richesse pilote la dépense, jamais l'existence).
-- Rollback : rejouer 015_objectif_10000.sql (les deux vues y sont intégralement définies).

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
  END AS niveau,
  (
    COALESCE(est_ess, false)
    OR COALESCE(est_bio, false)
    OR COALESCE(artisan_rm, false)
    OR naf_code LIKE '01.%'
    OR naf_code LIKE '03.%'
    OR naf_code LIKE '11.02%'
    OR naf_code LIKE '47.8%'
    OR source = 'sirene_first_pipeline_b'
  ) AS est_differenciant
FROM public.merchants;

CREATE OR REPLACE VIEW public.objectif_10000 AS
SELECT metric, value FROM (
  SELECT 'objectif' AS metric, 10000 AS value, 0 AS ord
  UNION ALL SELECT 'total', COUNT(*), 1 FROM merchants
  UNION ALL SELECT 'differenciants_publies', COUNT(*) FILTER (WHERE est_differenciant AND status = 'active'), 2 FROM catalogue_niveaux
  UNION ALL SELECT 'publies', COUNT(*) FILTER (WHERE status = 'active'), 3 FROM merchants
  UNION ALL SELECT 'verifies_sirene', COUNT(*) FILTER (WHERE siret IS NOT NULL AND sirene_etat = 'A'), 4 FROM merchants
  UNION ALL SELECT 'premium', COUNT(*) FILTER (WHERE niveau = 'PREMIUM'), 5 FROM catalogue_niveaux
  UNION ALL SELECT 'riches', COUNT(*) FILTER (WHERE niveau = 'RICHE'), 6 FROM catalogue_niveaux
  UNION ALL SELECT 'standard', COUNT(*) FILTER (WHERE niveau = 'STANDARD'), 7 FROM catalogue_niveaux
  UNION ALL SELECT 'minimal', COUNT(*) FILTER (WHERE niveau = 'MINIMAL'), 8 FROM catalogue_niveaux
  UNION ALL SELECT 'taux_completude_pct', ROUND(AVG(presentation_score) * 100.0 / 12), 9 FROM merchants
  UNION ALL SELECT 'fermes_encore_actifs', COUNT(*) FILTER (WHERE sirene_etat = 'F' AND status = 'active'), 10 FROM merchants
  UNION ALL SELECT 'acquisitions_7_jours', COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days'), 11 FROM merchants
  UNION ALL SELECT 'acquisitions_aujourdhui', COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())), 12 FROM merchants
) t ORDER BY ord;

COMMENT ON VIEW public.objectif_10000 IS
  'Tableau de bord OBJECTIF 10 000 commerces qualifiés. differenciants_publies = preuves positives (ESS/bio/RM/production/marchés/pipeline B) — le volume riche ne masque jamais la part différenciante. Les niveaux priorisent acquisition/affichage/commercial — jamais la visibilité (un vérifié minimal reste publié).';
