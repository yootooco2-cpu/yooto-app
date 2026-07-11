-- Ticket 2 (pipeline, séparé du moteur — décision de validation 12/07) :
-- PERSISTANCE DES PREUVES D'ENGAGEMENT OFFICIELLES de l'API Recherche d'Entreprises.
-- Sémantique « preuves positives uniquement » : TRUE = prouvé par l'État ;
-- NULL = aucune preuve (le silence ne punit pas — jamais un FALSE deviné).
-- La Cagette (SAS 5710, est_ess=true) a démontré que la catégorie Coopératives
-- est invisible au NAF : le moteur sait décider, cette donnée lui manquait.
-- Rollback : ALTER TABLE merchants DROP COLUMN est_ess, DROP COLUMN est_bio;

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS est_ess boolean,
  ADD COLUMN IF NOT EXISTS est_bio boolean;

COMMENT ON COLUMN public.merchants.est_ess IS
  'Économie sociale et solidaire — preuve officielle (API Recherche d''Entreprises, complements.est_ess). TRUE=prouvé, NULL=aucune preuve.';
COMMENT ON COLUMN public.merchants.est_bio IS
  'Agriculture biologique — preuve officielle (Agence Bio via complements.est_bio). TRUE=prouvé, NULL=aucune preuve.';
