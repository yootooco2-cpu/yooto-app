import type { Merchant } from './types';

/** Tags lisibles d'un commerce (ouvert, producteur, PMR, récompenses). */
export function getMerchantTags(merchant: Merchant): string[] {
  const tags: string[] = [];
  if (merchant.isOpenNow) tags.push('Ouvert');
  if (merchant.isProducer) tags.push('Producteur');
  if (merchant.isAccessible) tags.push('PMR');
  if (merchant.hasRewards) tags.push('Récompenses');
  return tags;
}

/**
 * Raisons de recommandation, dérivées des attributs du commerce.
 * (Génération locale — sera enrichie par l'IA / Supabase plus tard.)
 */
export function buildRecommendationReasons(merchant: Merchant): string[] {
  const reasons: string[] = [];

  if (merchant.isProducer) {
    reasons.push('Producteur local en vente directe : circuit court et juste rémunération.');
  }
  if (typeof merchant.ecoScore === 'number') {
    if (merchant.ecoScore >= 90) {
      reasons.push(`Score écologique excellent (${merchant.ecoScore}/100).`);
    } else if (merchant.ecoScore >= 80) {
      reasons.push(`Bon score écologique (${merchant.ecoScore}/100).`);
    }
  }
  if (merchant.hasRewards) {
    reasons.push('Tu cumules des récompenses YOOTOO à chaque visite.');
  }
  if (merchant.isAccessible) {
    reasons.push('Lieu accessible aux personnes à mobilité réduite.');
  }
  if (merchant.isOpenNow) {
    reasons.push('Ouvert maintenant, à quelques minutes de toi.');
  }
  if (reasons.length === 0) {
    reasons.push('Commerce indépendant proche de toi.');
  }

  return reasons;
}
