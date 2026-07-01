import type { Merchant } from '@/features/merchants';

import { reasonsFromContributions } from './discoveryReasons';
import { rankMerchants } from './ranking';
import { scoreMerchant } from './score';
import type { DiscoveryContext, ScoredMerchant } from './types';

/**
 * Façade haut niveau du Discovery Engine — point d'entrée unique des écrans.
 * Toute recommandation de l'app doit passer par ici.
 */
export function recommend(
  merchants: Merchant[],
  ctx: DiscoveryContext,
  options?: { limit?: number },
): ScoredMerchant[] {
  const ranked = rankMerchants(merchants, ctx);
  return typeof options?.limit === 'number' ? ranked.slice(0, options.limit) : ranked;
}

/** Raisons de recommandation pour un commerce (fiche, carte, etc.). */
export function getDiscoveryReasons(merchant: Merchant, ctx: DiscoveryContext): string[] {
  const { contributions } = scoreMerchant(merchant, ctx);
  const reasons = reasonsFromContributions(contributions);
  return reasons.length > 0 ? reasons : ['Commerce indépendant proche de vous.'];
}
