-- Ticket 2 (suite — décision de clôture GATE 2) : « autres preuves officielles ».
-- Même sémantique que 012 : TRUE = prouvé par l'État, NULL = aucune preuve (jamais FALSE deviné).
-- Le SPT exploite déjà ces preuves (fetch live) ; la persistance supprime la dépendance réseau.
-- Le moteur de classification reste GELÉ — on améliore la donnée, jamais la logique.
-- Rollback : ALTER TABLE merchants DROP COLUMN artisan_rm, DROP COLUMN est_societe_mission;

ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS artisan_rm boolean,
  ADD COLUMN IF NOT EXISTS est_societe_mission boolean;

COMMENT ON COLUMN public.merchants.artisan_rm IS
  'Artisan inscrit au Répertoire des Métiers — preuve officielle (activite_principale_registre_metier sur l''établissement). TRUE=prouvé, NULL=aucune preuve.';
COMMENT ON COLUMN public.merchants.est_societe_mission IS
  'Société à mission — preuve officielle (complements.est_societe_mission). TRUE=prouvé, NULL=aucune preuve.';
