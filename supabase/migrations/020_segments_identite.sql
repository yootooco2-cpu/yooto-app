-- TABLEAU DE BORD PAR SEGMENTS D'IDENTITÉ (décision 12/07, ouverture 56.10A) :
-- « Le volume est un moyen. L'identité de YOOTOO reste portée par les producteurs,
--   les artisans, les commerces indépendants et les acteurs locaux. »
-- Les restaurants densifient — le tableau distingue pour que le volume ne masque
-- jamais l'identité. Segments = preuves en base (NAF, flags officiels), publiés only.
-- Rollback : rejouer 019.

CREATE OR REPLACE VIEW public.objectif_10000 AS
SELECT metric, value FROM (
  SELECT 'objectif' AS metric, 10000 AS value, 0 AS ord
  UNION ALL SELECT 'palier_courant', 5000, 1
  UNION ALL SELECT 'total', COUNT(*), 2 FROM merchants
  UNION ALL SELECT 'publies', COUNT(*) FILTER (WHERE status = 'active'), 3 FROM merchants
  -- Segments d'identité (publiés)
  UNION ALL SELECT 'seg_producteurs', COUNT(*) FILTER (WHERE status = 'active' AND (naf_code LIKE '01.%' OR naf_code LIKE '02.%' OR naf_code LIKE '03.%' OR source = 'sirene_first_pipeline_b')), 4 FROM merchants
  UNION ALL SELECT 'seg_artisans_rm', COUNT(*) FILTER (WHERE status = 'active' AND artisan_rm), 5 FROM merchants
  UNION ALL SELECT 'seg_metiers_bouche', COUNT(*) FILTER (WHERE status = 'active' AND (naf_code LIKE '10.%' OR naf_code LIKE '47.2%')), 6 FROM merchants
  UNION ALL SELECT 'seg_commerces_proximite', COUNT(*) FILTER (WHERE status = 'active' AND (naf_code LIKE '47.%' AND naf_code NOT LIKE '47.2%')), 7 FROM merchants
  UNION ALL SELECT 'seg_ess', COUNT(*) FILTER (WHERE status = 'active' AND est_ess), 8 FROM merchants
  UNION ALL SELECT 'seg_reemploi', COUNT(*) FILTER (WHERE status = 'active' AND (naf_code LIKE '47.79%' OR naf_code LIKE '38.31%' OR naf_code LIKE '95.2%')), 9 FROM merchants
  UNION ALL SELECT 'seg_restaurants', COUNT(*) FILTER (WHERE status = 'active' AND (naf_code LIKE '56.10%' OR category = 'restaurant')), 10 FROM merchants
  UNION ALL SELECT 'objectif_differenciants', 1000, 11
  UNION ALL SELECT 'differenciants_publies', COUNT(*) FILTER (WHERE est_differenciant AND status = 'active'), 12 FROM catalogue_niveaux
  UNION ALL SELECT 'verifies_sirene', COUNT(*) FILTER (WHERE siret IS NOT NULL AND sirene_etat = 'A'), 13 FROM merchants
  UNION ALL SELECT 'acquisitions_7_jours', COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days'), 14 FROM merchants
  UNION ALL SELECT 'fermes_encore_actifs', COUNT(*) FILTER (WHERE sirene_etat = 'F' AND status = 'active'), 15 FROM merchants
  -- Qualité (secondaire)
  UNION ALL SELECT 'objectif_premium', 2500, 16
  UNION ALL SELECT 'premium', COUNT(*) FILTER (WHERE niveau = 'PREMIUM'), 17 FROM catalogue_niveaux
  UNION ALL SELECT 'riches', COUNT(*) FILTER (WHERE niveau = 'RICHE'), 18 FROM catalogue_niveaux
  UNION ALL SELECT 'standard', COUNT(*) FILTER (WHERE niveau = 'STANDARD'), 19 FROM catalogue_niveaux
  UNION ALL SELECT 'minimal', COUNT(*) FILTER (WHERE niveau = 'MINIMAL'), 20 FROM catalogue_niveaux
  UNION ALL SELECT 'taux_completude_pct', ROUND(AVG(presentation_score) * 100.0 / 12), 21 FROM merchants
) t ORDER BY ord;

COMMENT ON VIEW public.objectif_10000 IS
  'Paliers 5000/7500/10000. Segments d''identité (producteurs, artisans RM, bouche, proximité, ESS, réemploi) vs restaurants (densité, jamais le cœur). Premium = qualité secondaire.';
