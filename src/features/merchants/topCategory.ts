import type { Merchant } from './types';

/**
 * MEILLEURES ADRESSES D'UNE CATÉGORIE — classement de la bande horizontale de la carte.
 *
 * Priorités STRICTES (validées produit), appliquées en cascade :
 *  1. commerçants partenaires YOOTOO (`hasRewards`) ;
 *  2. meilleur score local (`localScore`) ;
 *  3. meilleure note Google (`rating`) ;
 *  4. nombre d'avis (`reviewCount`) ;
 *  5. proximité géographique (`distanceKm`).
 *
 * Valeurs absentes : reléguées derrière les valeurs connues à chaque niveau
 * (sentinelles finies → jamais de NaN dans le tri). AUCUNE notion de favoris
 * personnels ici : la bande met en avant les meilleurs commerces locaux.
 */
function compareTopCategory(a: Merchant, b: Merchant): number {
  const partner = Number(Boolean(b.hasRewards)) - Number(Boolean(a.hasRewards));
  if (partner !== 0) return partner;
  const local = (b.localScore ?? -1) - (a.localScore ?? -1);
  if (local !== 0) return local;
  const rating = (b.rating ?? -1) - (a.rating ?? -1);
  if (rating !== 0) return rating;
  const reviews = (b.reviewCount ?? -1) - (a.reviewCount ?? -1);
  if (reviews !== 0) return reviews;
  return (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
}

/** Top N d'une catégorie (défaut 12) — tri stable, jamais de mutation de l'entrée. */
export function rankTopCategoryMerchants<T extends Merchant>(
  merchants: readonly T[],
  limit = 12,
): T[] {
  return [...merchants].sort(compareTopCategory).slice(0, Math.max(0, limit));
}
