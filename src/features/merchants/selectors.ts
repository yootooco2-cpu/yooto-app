import { DEMO_MERCHANTS } from './data';
import type { Merchant, MerchantId, MerchantRepository } from './types';

/** Accès synchrone (données locales) — pratique pour l'UI actuelle. */
export function getMerchantById(id: MerchantId): Merchant | undefined {
  return DEMO_MERCHANTS.find((merchant) => merchant.id === id);
}

/**
 * Implémentation locale du contrat `MerchantRepository`.
 * Sera remplacée par un `supabaseMerchantRepository` sans toucher aux écrans.
 */
export const localMerchantRepository: MerchantRepository = {
  list: () => Promise.resolve(DEMO_MERCHANTS),
  getById: (id) => Promise.resolve(getMerchantById(id) ?? null),
};
