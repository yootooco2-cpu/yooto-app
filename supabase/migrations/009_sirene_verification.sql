-- V2.4 SIRENE — Identité légale vérifiée (source : API Recherche d'Entreprises, État français).
-- Colonnes ADDITIVES uniquement (aucune valeur par défaut trompeuse : NULL = non vérifié).
-- Peuplées par le pipeline SIRENE en FILL-ONLY — jamais d'écrasement d'une valeur existante.

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS naf_code text,
  ADD COLUMN IF NOT EXISTS sirene_date_creation date,
  ADD COLUMN IF NOT EXISTS sirene_etat text,
  ADD COLUMN IF NOT EXISTS sirene_nb_etablissements integer,
  ADD COLUMN IF NOT EXISTS verification_score integer,
  ADD COLUMN IF NOT EXISTS sirene_synced_at timestamptz;

COMMENT ON COLUMN public.merchants.siret IS 'SIRET de l''établissement matché (SIRENE). NULL = non vérifié.';
COMMENT ON COLUMN public.merchants.naf_code IS 'Code NAF/APE officiel (ex. 47.21Z) — catégorie objective d''activité.';
COMMENT ON COLUMN public.merchants.sirene_date_creation IS 'Date de création de l''établissement — alimente « Nouveau dans votre quartier » et « Depuis YYYY ».';
COMMENT ON COLUMN public.merchants.sirene_etat IS 'État administratif SIRENE : A = actif, C = cessé (détection des fermetures).';
COMMENT ON COLUMN public.merchants.sirene_nb_etablissements IS 'Nb d''établissements de l''unité légale : 1 = indépendance prouvée.';
COMMENT ON COLUMN public.merchants.verification_score IS 'Score interne 0-100 : identité (40) + cohérence Google/SIRENE (20) + complétude (20) + fraîcheur (20). Invisible dans l''app, carburant IA.';
COMMENT ON COLUMN public.merchants.sirene_synced_at IS 'Dernière tentative de matching SIRENE (posée même sans match → pas de re-essai en boucle).';

-- Un SIRET ne peut appartenir qu'à une fiche (anti-doublon d'identité légale).
CREATE UNIQUE INDEX IF NOT EXISTS merchants_siret_unique
  ON public.merchants (siret) WHERE siret IS NOT NULL;

-- « Nouveau dans votre quartier » : lecture par date de création décroissante.
CREATE INDEX IF NOT EXISTS merchants_sirene_creation_idx
  ON public.merchants (sirene_date_creation DESC) WHERE sirene_date_creation IS NOT NULL;

-- File de travail du pipeline : les non-encore-tentés d'abord.
CREATE INDEX IF NOT EXISTS merchants_sirene_sync_idx
  ON public.merchants (sirene_synced_at ASC NULLS FIRST);
