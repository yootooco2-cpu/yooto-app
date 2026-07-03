// mapLocation — helpers PURS pour la localisation sur la carte (PR1).
// Aucune dépendance React / carte → testables isolément.

/** Bornes du halo de précision (px). */
const HALO_MIN_PX = 14;
const HALO_MAX_PX = 44;
/** Plage de précision (m) sur laquelle le halo grandit linéairement. */
const ACCURACY_GOOD_M = 10;
const ACCURACY_POOR_M = 150;

/**
 * Rayon (px) du halo de précision autour du point utilisateur.
 * Bonne précision (≤ 10 m) → petit halo ; mauvaise (≥ 150 m) → grand halo.
 * Précision inconnue → halo modeste (repère lisible sans surévaluer la certitude).
 */
export function accuracyToHaloPx(accuracy?: number | null): number {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy <= 0) {
    return HALO_MIN_PX + 6;
  }
  const t = Math.max(0, Math.min(1, (accuracy - ACCURACY_GOOD_M) / (ACCURACY_POOR_M - ACCURACY_GOOD_M)));
  return Math.round(HALO_MIN_PX + t * (HALO_MAX_PX - HALO_MIN_PX));
}
