-- TABLEAU DE BORD À TROIS OBJECTIFS (décision 12/07 soir) :
--   10 000 commerces · 1 000 différenciants · 2 500 fiches Premium.
-- Lignes d'objectifs ajoutées à la vue — les métriques existantes sont inchangées.
-- Rollback : rejouer 016 (objectif_10000 y est définie).

CREATE OR REPLACE VIEW public.objectif_10000 AS
SELECT metric, value FROM (
  SELECT 'objectif' AS metric, 10000 AS value, 0 AS ord
  UNION ALL SELECT 'objectif_differenciants', 1000, 1
  UNION ALL SELECT 'objectif_premium', 2500, 2
  UNION ALL SELECT 'total', COUNT(*), 3 FROM merchants
  UNION ALL SELECT 'differenciants_publies', COUNT(*) FILTER (WHERE est_differenciant AND status = 'active'), 4 FROM catalogue_niveaux
  UNION ALL SELECT 'publies', COUNT(*) FILTER (WHERE status = 'active'), 5 FROM merchants
  UNION ALL SELECT 'verifies_sirene', COUNT(*) FILTER (WHERE siret IS NOT NULL AND sirene_etat = 'A'), 6 FROM merchants
  UNION ALL SELECT 'premium', COUNT(*) FILTER (WHERE niveau = 'PREMIUM'), 7 FROM catalogue_niveaux
  UNION ALL SELECT 'riches', COUNT(*) FILTER (WHERE niveau = 'RICHE'), 8 FROM catalogue_niveaux
  UNION ALL SELECT 'standard', COUNT(*) FILTER (WHERE niveau = 'STANDARD'), 9 FROM catalogue_niveaux
  UNION ALL SELECT 'minimal', COUNT(*) FILTER (WHERE niveau = 'MINIMAL'), 10 FROM catalogue_niveaux
  UNION ALL SELECT 'taux_completude_pct', ROUND(AVG(presentation_score) * 100.0 / 12), 11 FROM merchants
  UNION ALL SELECT 'fermes_encore_actifs', COUNT(*) FILTER (WHERE sirene_etat = 'F' AND status = 'active'), 12 FROM merchants
  UNION ALL SELECT 'acquisitions_7_jours', COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days'), 13 FROM merchants
  UNION ALL SELECT 'acquisitions_aujourdhui', COUNT(*) FILTER (WHERE created_at >= date_trunc('day', now())), 14 FROM merchants
) t ORDER BY ord;

COMMENT ON VIEW public.objectif_10000 IS
  'Tableau de bord permanent : 10 000 commerces · 1 000 différenciants · 2 500 Premium. Les niveaux priorisent acquisition/affichage/commercial — jamais la visibilité.';
