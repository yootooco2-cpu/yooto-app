-- RE-PRIORISATION (décision 12/07) : le VOLUME pilote, le Premium = KPI qualité
-- secondaire. Ordre d'affichage seulement — aucune métrique retirée (on ne dégrade
-- jamais un tableau de bord, on le réordonne).
-- Rollback : rejouer 018.

CREATE OR REPLACE VIEW public.objectif_10000 AS
SELECT metric, value FROM (
  SELECT 'objectif' AS metric, 10000 AS value, 0 AS ord
  UNION ALL SELECT 'total', COUNT(*), 1 FROM merchants
  UNION ALL SELECT 'publies', COUNT(*) FILTER (WHERE status = 'active'), 2 FROM merchants
  UNION ALL SELECT 'objectif_differenciants', 1000, 3
  UNION ALL SELECT 'differenciants_publies', COUNT(*) FILTER (WHERE est_differenciant AND status = 'active'), 4 FROM catalogue_niveaux
  UNION ALL SELECT 'verifies_sirene', COUNT(*) FILTER (WHERE siret IS NOT NULL AND sirene_etat = 'A'), 5 FROM merchants
  UNION ALL SELECT 'acquisitions_7_jours', COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days'), 6 FROM merchants
  UNION ALL SELECT 'acquisitions_aujourdhui', COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())), 7 FROM merchants
  UNION ALL SELECT 'fermes_encore_actifs', COUNT(*) FILTER (WHERE sirene_etat = 'F' AND status = 'active'), 8 FROM merchants
  -- Qualité (indicateurs secondaires)
  UNION ALL SELECT 'objectif_premium', 2500, 9
  UNION ALL SELECT 'premium', COUNT(*) FILTER (WHERE niveau = 'PREMIUM'), 10 FROM catalogue_niveaux
  UNION ALL SELECT 'riches', COUNT(*) FILTER (WHERE niveau = 'RICHE'), 11 FROM catalogue_niveaux
  UNION ALL SELECT 'standard', COUNT(*) FILTER (WHERE niveau = 'STANDARD'), 12 FROM catalogue_niveaux
  UNION ALL SELECT 'minimal', COUNT(*) FILTER (WHERE niveau = 'MINIMAL'), 13 FROM catalogue_niveaux
  UNION ALL SELECT 'taux_completude_pct', ROUND(AVG(presentation_score) * 100.0 / 12), 14 FROM merchants
) t ORDER BY ord;

COMMENT ON VIEW public.objectif_10000 IS
  'Pilotage VOLUME : 10 000 commerces, 1 000 différenciants, couverture des bassins (vues bilans). Premium 2 500 = KPI qualité secondaire. Le coût par commerce vit dans les journaux de campagne.';
