import { createEntityRepository } from '@/lib/data/createEntityRepository';
import { createSupabaseDataSource } from '@/lib/supabase/datasource';

import { parseMerchantRow } from './schema';
import { localMerchantDataSource } from './selectors';
import type { MerchantRepository } from './types';

/**
 * Repository commerces : Supabase si configuré, sinon fallback local.
 * Construit paresseusement (la datasource lit le client lazy) → web/Expo Go OK.
 * COUTURE offline : passer un `cache` (MMKV) à `createEntityRepository` plus tard.
 */
export function getMerchantRepository(): MerchantRepository {
  const remote = createSupabaseDataSource({
    table: 'merchants',
    parse: parseMerchantRow,
  });

  return createEntityRepository({
    remote,
    fallback: localMerchantDataSource,
    // cache: merchantMmkvCache,  // ← S6 offline, non câblé
  });
}
