// flags — Feature flags du moteur de découverte (Sprint 2).
//
// `rankingV2` protège le nouveau comportement multiplicatif (categorySignal / gate éditorial).
// Défaut OFF → tant qu'il n'est pas activé, le moteur produit EXACTEMENT l'ordre actuel.
// État module-level volontairement simple : bascule runtime (A/B, rollback instantané) sans
// redéploiement de logique. Le câblage à une UI de debug / un remote-config est hors périmètre.

let rankingV2Enabled = false;

/** Le ranking v2 (gate éditorial multiplicatif) est-il actif ? Défaut `false`. */
export function getRankingV2(): boolean {
  return rankingV2Enabled;
}

/** Active/désactive le ranking v2 (comparaison A/B, rollback). */
export function setRankingV2(enabled: boolean): void {
  rankingV2Enabled = enabled;
}
