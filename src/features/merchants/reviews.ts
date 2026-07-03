// reviews — helpers PURS pour le bloc « Avis clients » ÉVOLUTIF.
//
// Aujourd'hui : note moyenne + nombre d'avis (seules données Supabase disponibles).
// Demain : si une répartition par étoile (5★→1★) devient disponible, les barres
// apparaissent AUTOMATIQUEMENT — sans changer le layout. Aucune donnée inventée :
// les barres ne s'affichent QUE si la répartition existe réellement.

/** Répartition des avis par étoile (5→1). Optionnelle : absente aujourd'hui. */
export type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

/** Note formatée à la française : 4.6 → « 4,6 ». */
export function formatRatingFr(rating: number): string {
  return rating.toFixed(1).replace('.', ',');
}

/** Nombre d'étoiles pleines / vides (sur 5) pour l'affichage. */
export function starFill(rating: number): { full: number; empty: number } {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return { full, empty: 5 - full };
}

/** La répartition par étoile existe-t-elle réellement (total > 0) ? */
export function hasRatingDistribution(d?: RatingDistribution | null): d is RatingDistribution {
  if (!d) return false;
  const total = d[1] + d[2] + d[3] + d[4] + d[5];
  return Number.isFinite(total) && total > 0;
}

/** Proportion [0,1] des avis pour une étoile donnée (0 si aucune donnée). */
export function distributionRatio(d: RatingDistribution, star: 1 | 2 | 3 | 4 | 5): number {
  const total = d[1] + d[2] + d[3] + d[4] + d[5];
  return total > 0 ? d[star] / total : 0;
}
