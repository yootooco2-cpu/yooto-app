import type { Merchant } from '@/features/merchants';

import { recommend } from './recommendationEngine';
import type { DiscoveryContext, ScoredMerchant } from './types';

/**
 * Signature compacte du contexte → clé de cache. Deux contextes équivalents
 * (même position arrondie, même heure/saison, mêmes ensembles) partagent le calcul.
 */
export function contextSignature(ctx: DiscoveryContext): string {
  const loc = ctx.userLocation
    ? `${ctx.userLocation.latitude.toFixed(3)},${ctx.userLocation.longitude.toFixed(3)}`
    : 'none';
  return [
    loc,
    ctx.hour,
    ctx.weekday,
    ctx.season,
    ctx.favorites.size,
    ctx.history.size,
    ctx.preferredCategories.size,
    ctx.intent?.keys.join(',') ?? 'na',
    ctx.preferences
      ? `${ctx.preferences.topCategories.join('.')}:${ctx.preferences.hasData}:${ctx.preferences.producerAffinity.toFixed(1)}`
      : 'na',
    ctx.weather ?? 'na',
    ctx.trafficLevel ?? 'na',
    ctx.budget ?? 'na',
    ctx.mobility ?? 'na',
    ctx.calendarBusy ?? 'na',
    // Feature flag ranking v2 : DEUX états (ON/OFF) → DEUX entrées de cache distinctes,
    // sinon un flip servirait un résultat mis en cache de l'état précédent (empoisonnement).
    `v2:${(ctx.extras as { rankingV2?: boolean } | undefined)?.rankingV2 ?? false}`,
  ].join('|');
}

/**
 * Cache à deux niveaux :
 *  - WeakMap par référence de tableau `merchants` (stable via React Query) →
 *    libéré automatiquement quand la liste change (pas de fuite mémoire) ;
 *  - Map interne par signature de contexte (+ limite).
 */
const cache = new WeakMap<Merchant[], Map<string, ScoredMerchant[]>>();

export function recommendCached(
  merchants: Merchant[],
  ctx: DiscoveryContext,
  options?: { limit?: number },
): ScoredMerchant[] {
  let perArray = cache.get(merchants);
  if (!perArray) {
    perArray = new Map();
    cache.set(merchants, perArray);
  }
  const key = `${contextSignature(ctx)}#${options?.limit ?? 'all'}`;
  const hit = perArray.get(key);
  if (hit) return hit;

  const result = recommend(merchants, ctx, options);
  perArray.set(key, result);
  return result;
}
