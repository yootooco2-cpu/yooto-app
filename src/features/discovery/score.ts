import type { Merchant } from '@/features/merchants';

import { getSignals } from './registry';
import type { DiscoveryContext, SignalContribution } from './types';

export interface ScoreResult {
  score: number; // [0,1], interne
  contributions: SignalContribution[];
}

/** Discovery Score = moyenne pondérée des signaux applicables (registre plug-in). */
export function scoreMerchant(merchant: Merchant, ctx: DiscoveryContext): ScoreResult {
  const contributions = getSignals()
    .map((signal) => signal(merchant, ctx))
    .filter((c): c is SignalContribution => c !== null);
  const totalWeight = contributions.reduce((acc, c) => acc + c.weight, 0);
  const weighted = contributions.reduce((acc, c) => acc + c.weight * c.value, 0);
  return { score: totalWeight > 0 ? weighted / totalWeight : 0, contributions };
}
