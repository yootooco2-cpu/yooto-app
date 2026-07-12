-- BILANS PAR BASSIN (mission 12/07) : expose city dans catalogue_niveaux pour
-- mesurer niveaux et différenciants par commune/bassin sans dupliquer la formule
-- côté client (Loi 7 — une seule incarnation de la règle).
-- Rollback : rejouer 016 (colonne ajoutée en fin de vue, OR REPLACE compatible).

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
  ) AS est_differenciant,
  city
FROM public.merchants;

