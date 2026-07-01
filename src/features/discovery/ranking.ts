import type { Merchant } from '@/features/merchants';

import { reasonsFromContributions } from './discoveryReasons';
import { scoreMerchant } from './score';
import type { DiscoveryContext, ScoredMerchant } from './types';

/** Classe les commerces par pertinence décroissante (Discovery Score). */
export function rankMerchants(merchants: Merchant[], ctx: DiscoveryContext): ScoredMerchant[] {
  return merchants
    .map((merchant) => {
      const { score, contributions } = scoreMerchant(merchant, ctx);
      return {
        merchant,
        score,
        contributions,
        reasons: reasonsFromContributions(contributions),
      } satisfies ScoredMerchant;
    })
    .sort((a, b) => b.score - a.score);
}
