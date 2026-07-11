-- Sprint 2 / Vague 0 — CORRECTIF DE CONFIANCE de la vue territory_coverage.
--
-- Bug corrigé : `fermetures_detectees` filtrait sur sirene_etat = 'C', vocabulaire de
-- l'UNITÉ LÉGALE (A/C) alors que la base stocke l'état ÉTABLISSEMENT (A/F). Résultat :
-- 0 fermeture affichée depuis la création de la vue — le garde-fou était aveugle.
-- Domaine réel observé (audit 11/07/2026, 802 lignes) : {'A': 367, 'F': 17, NULL: 418}.
--
-- Autres corrections d'audit :
--  • verifies_sirene comptait les établissements FERMÉS comme vérifiés (17 en trop) ;
--  • producteurs_verifies comptait les élevages fermés (4 en trop) ;
--  • jeunes_commerces_210j pouvait compter une création récente déjà fermée ;
--  • site_web / telephone comptaient la chaîne VIDE '' comme couverte (135 en trop chacun) ;
--  • ajout des compteurs d'ANOMALIE exigés par le garde-fou de montée en charge :
--    - fermes_encore_actifs : fiches F publiées (doit tendre vers 0 et y rester) ;
--    - etat_sirene_hors_domaine : valeur ≠ A/F non nulle (alerte d'évolution du domaine).
--
-- Invariants testables (voir scripts/spt/score.test.ts pour la logique jumelle TS) :
--  • une fiche F qui devient active → fermes_encore_actifs +1 ;
--  • une fiche F qui repasse pending → fermes_encore_actifs −1 ;
--  • une fiche NULL active n'est JAMAIS comptée fermée (le silence ne punit pas) ;
--  • verifies_sirene + fermetures + non-rapprochés = total (segments disjoints).
--
-- Rollback : ré-appliquer 010_territory_coverage_view.sql (CREATE OR REPLACE) —
-- la 010 n'est volontairement PAS modifiée (historique de migration immuable).

CREATE OR REPLACE VIEW public.territory_coverage AS
SELECT metric, value, total, ROUND(100.0 * value / NULLIF(total, 0), 1) AS pct
FROM (
  SELECT 'commerces'                        AS metric, COUNT(*) AS value, COUNT(*) AS total, 0 AS ord FROM merchants
  UNION ALL SELECT 'publies',               COUNT(*) FILTER (WHERE status = 'active'), COUNT(*), 1 FROM merchants
  -- Vérifié = SIRET présent ET établissement ACTIF (allowlist : F/NULL exclus).
  UNION ALL SELECT 'verifies_sirene',        COUNT(*) FILTER (WHERE siret IS NOT NULL AND sirene_etat = 'A'), COUNT(*), 2 FROM merchants
  UNION ALL SELECT 'independants_prouves',   COUNT(*) FILTER (WHERE siret IS NOT NULL AND sirene_etat = 'A' AND sirene_nb_etablissements = 1), COUNT(*) FILTER (WHERE siret IS NOT NULL AND sirene_etat = 'A'), 3 FROM merchants
  UNION ALL SELECT 'producteurs_verifies',   COUNT(*) FILTER (WHERE sirene_etat = 'A' AND (naf_code LIKE '01%' OR naf_code LIKE '02%' OR naf_code LIKE '03%')), COUNT(*), 4 FROM merchants
  UNION ALL SELECT 'jeunes_commerces_210j',  COUNT(*) FILTER (WHERE sirene_etat = 'A' AND sirene_date_creation >= now() - interval '210 days'), COUNT(*), 5 FROM merchants
  -- État établissement : 'F' = fermé. Un état non nul ≠ 'A' est compté fermé ;
  -- s'il n'est ni A ni F il déclenche AUSSI l'alerte hors-domaine ci-dessous.
  UNION ALL SELECT 'fermetures_detectees',   COUNT(*) FILTER (WHERE sirene_etat IS NOT NULL AND sirene_etat <> 'A'), COUNT(*) FILTER (WHERE sirene_etat IS NOT NULL), 6 FROM merchants
  -- ANOMALIES (garde-fou de montée en charge : les deux doivent rester à 0).
  UNION ALL SELECT 'fermes_encore_actifs',   COUNT(*) FILTER (WHERE sirene_etat = 'F' AND status = 'active'), COUNT(*) FILTER (WHERE sirene_etat = 'F'), 7 FROM merchants
  UNION ALL SELECT 'etat_sirene_hors_domaine', COUNT(*) FILTER (WHERE sirene_etat IS NOT NULL AND sirene_etat NOT IN ('A', 'F')), COUNT(*) FILTER (WHERE sirene_etat IS NOT NULL), 8 FROM merchants
  UNION ALL SELECT 'photo_couverture',       COUNT(*) FILTER (WHERE cover_photo_url IS NOT NULL OR photo_url IS NOT NULL), COUNT(*), 9 FROM merchants
  -- '' (chaîne vide) n'est PAS une couverture.
  UNION ALL SELECT 'telephone',              COUNT(*) FILTER (WHERE NULLIF(phone, '') IS NOT NULL), COUNT(*), 10 FROM merchants
  UNION ALL SELECT 'horaires',               COUNT(*) FILTER (WHERE opening_hours IS NOT NULL), COUNT(*), 11 FROM merchants
  UNION ALL SELECT 'categorie',              COUNT(*) FILTER (WHERE NULLIF(category, '') IS NOT NULL), COUNT(*), 12 FROM merchants
  UNION ALL SELECT 'site_web',               COUNT(*) FILTER (WHERE NULLIF(website, '') IS NOT NULL), COUNT(*), 13 FROM merchants
  UNION ALL SELECT 'note_google',            COUNT(*) FILTER (WHERE google_rating IS NOT NULL), COUNT(*), 14 FROM merchants
  UNION ALL SELECT 'score_verification_moyen', COALESCE(ROUND(AVG(verification_score)), 0), 100, 15 FROM merchants WHERE siret IS NOT NULL
  UNION ALL SELECT 'sync_sirene_couverte',   COUNT(*) FILTER (WHERE sirene_synced_at IS NOT NULL), COUNT(*), 16 FROM merchants
  UNION ALL SELECT 'enrichis_google_90j',    COUNT(*) FILTER (WHERE last_enrichment_sync >= now() - interval '90 days'), COUNT(*), 17 FROM merchants
) AS metrics
ORDER BY ord;

COMMENT ON VIEW public.territory_coverage IS
  'Tableau de bord qualité Territory Engine (v2, Vague 0 Sprint 2) : état établissement A/F/NULL, anomalies fermes_encore_actifs et etat_sirene_hors_domaine = garde-fous de montée en charge (doivent rester à 0). Lecture seule.';
