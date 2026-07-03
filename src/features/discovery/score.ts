import type { Merchant } from '@/features/merchants';

import { aggregate } from './aggregate';
import { getSignals } from './registry';
import type { DiscoveryContext, SignalContribution } from './types';

export interface ScoreResult {
  score: number; // [0,1], interne
  contributions: SignalContribution[];
}

/**
 * Discovery Score = agrégation v2 des signaux applicables (registre plug-in).
 * Tant que tous les signaux sont additifs (état actuel), l'agrégateur préserve exactement
 * l'ORDRE de la moyenne pondérée historique (cf. `aggregate` + tests de non-régression).
 */
export function scoreMerchant(merchant: Merchant, ctx: DiscoveryContext): ScoreResult {
  const contributions = getSignals()
    .map((signal) => signal(merchant, ctx))
    .filter((c): c is SignalContribution => c !== null);
  return { score: aggregate(contributions), contributions };
}
