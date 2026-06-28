import { DEMO_MERCHANTS } from './data';
import type { Merchant, MerchantDataSource, MerchantId } from './types';

/** Accès synchrone (données locales) — pratique pour l'UI actuelle. */
export function getMerchantById(id: MerchantId): Merchant | undefined {
  return DEMO_MERCHANTS.find((merchant) => merchant.id === id);
}

/**
 * Source de données LOCALE (données de démo) — sert de fallback au repository
 * quand Supabase n'est pas configuré, et de seed offline plus tard.
 */
export const localMerchantDataSource: MerchantDataSource = {
  list: () => Promise.resolve(DEMO_MERCHANTS),
  getById: (id) => Promise.resolve(getMerchantById(id) ?? null),
};
