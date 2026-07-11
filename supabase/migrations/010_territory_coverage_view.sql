-- Sprint 1/J5 — TABLEAU DE BORD QUALITÉ du Territory Engine.
-- Vue de lecture (aucune écriture, DROP VIEW pour rollback) : mesure objective et
-- suivie dans le temps de la qualité des données. Consommée via REST/SQL/outils.

CREATE OR REPLACE VIEW public.territory_coverage AS
SELECT metric, value, total, ROUND(100.0 * value / NULLIF(total, 0), 1) AS pct
FROM (
  SELECT 'commerces'                        AS metric, COUNT(*) AS value, COUNT(*) AS total, 0 AS ord FROM merchants
  UNION ALL SELECT 'verifies_sirene',        COUNT(*) FILTER (WHERE siret IS NOT NULL), COUNT(*), 1 FROM merchants
  UNION ALL SELECT 'independants_prouves',   COUNT(*) FILTER (WHERE siret IS NOT NULL AND sirene_nb_etablissements = 1), COUNT(*) FILTER (WHERE siret IS NOT NULL), 2 FROM merchants
  UNION ALL SELECT 'producteurs_verifies',   COUNT(*) FILTER (WHERE naf_code LIKE '01%' OR naf_code LIKE '02%' OR naf_code LIKE '03%'), COUNT(*), 3 FROM merchants
  UNION ALL SELECT 'jeunes_commerces_210j',  COUNT(*) FILTER (WHERE sirene_date_creation >= now() - interval '210 days'), COUNT(*), 4 FROM merchants
  UNION ALL SELECT 'fermetures_detectees',   COUNT(*) FILTER (WHERE sirene_etat = 'C'), COUNT(*), 5 FROM merchants
  UNION ALL SELECT 'photo_couverture',       COUNT(*) FILTER (WHERE cover_photo_url IS NOT NULL OR photo_url IS NOT NULL), COUNT(*), 6 FROM merchants
  UNION ALL SELECT 'telephone',              COUNT(*) FILTER (WHERE phone IS NOT NULL), COUNT(*), 7 FROM merchants
  UNION ALL SELECT 'horaires',               COUNT(*) FILTER (WHERE opening_hours IS NOT NULL), COUNT(*), 8 FROM merchants
  UNION ALL SELECT 'categorie',              COUNT(*) FILTER (WHERE category IS NOT NULL), COUNT(*), 9 FROM merchants
  UNION ALL SELECT 'site_web',               COUNT(*) FILTER (WHERE website IS NOT NULL), COUNT(*), 10 FROM merchants
  UNION ALL SELECT 'note_google',            COUNT(*) FILTER (WHERE google_rating IS NOT NULL), COUNT(*), 11 FROM merchants
  UNION ALL SELECT 'score_verification_moyen', COALESCE(ROUND(AVG(verification_score)), 0), 100, 12 FROM merchants WHERE siret IS NOT NULL
  UNION ALL SELECT 'sync_sirene_couverte',   COUNT(*) FILTER (WHERE sirene_synced_at IS NOT NULL), COUNT(*), 13 FROM merchants
  UNION ALL SELECT 'enrichis_google_90j',    COUNT(*) FILTER (WHERE last_enrichment_sync >= now() - interval '90 days'), COUNT(*), 14 FROM merchants
) AS metrics
ORDER BY ord;

COMMENT ON VIEW public.territory_coverage IS
  'Tableau de bord qualité Territory Engine (Sprint 1) : vérification, complétude, fraîcheur. Lecture seule.';
