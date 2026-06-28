import { DEMO_MERCHANTS } from './data';
import { applyMerchantQueryLocal } from './merchantQuery';
import type { Merchant, MerchantDataSource, MerchantId } from './types';

/** Accès synchrone (données locales) — pratique pour l'UI actuelle. */
export function getMerchantById(id: MerchantId): Merchant | undefined {
  return DEMO_MERCHANTS.find((merchant) => merchant.id === id);
}

/**
 * Source de données LOCALE (données de démo) — fallback du repository quand
 * Supabase n'est pas configuré, et seed offline plus tard. Applique la même
 * sémantique de requête que le serveur (recherche + filtres + distance).
 */
export const localMerchantDataSource: MerchantDataSource = {
  list: (query) => Promise.resolve(applyMerchantQueryLocal(DEMO_MERCHANTS, query)),
  getById: (id) => Promise.resolve(getMerchantById(id) ?? null),
};
