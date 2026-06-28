import { createEntityRepository } from '@/lib/data/createEntityRepository';
import { createSupabaseDataSource } from '@/lib/supabase/datasource';

import { parseMerchants, reportMerchantIssues } from './merchantLoader';
import { buildSupabaseMerchantQuery, withDistance } from './merchantQuery';
import { parseMerchantRow } from './schema';
import { localMerchantDataSource } from './selectors';
import type { Merchant, MerchantDataSource, MerchantQuery, MerchantRepository } from './types';

/**
 * Repository commerces : Supabase si configuré, sinon fallback local.
 * Construit paresseusement (la datasource lit le client lazy) → web/Expo Go OK.
 *
 * Le serveur applique recherche + filtres ; la **distance** est dérivée côté
 * client (Phase A) en enveloppant la source distante avec `withDistance`.
 * COUTURE offline : passer un `cache` (MMKV) à `createEntityRepository` plus tard.
 */
export function getMerchantRepository(): MerchantRepository {
  const remoteBase = createSupabaseDataSource<Merchant, MerchantQuery>({
    table: 'merchants',
    parse: parseMerchantRow,
    // Parsing résilient ligne par ligne : une ligne invalide est ignorée, pas la liste.
    parseList: (rows) => {
      const result = parseMerchants(rows);
      reportMerchantIssues(result, 'supabase');
      return result.merchants;
    },
    buildQuery: buildSupabaseMerchantQuery,
  });

  const remote: MerchantDataSource | null = remoteBase && {
    list: async (query) => withDistance(await remoteBase.list(query), query?.near, query?.radiusKm),
    getById: (id) => remoteBase.getById(id),
  };

  return createEntityRepository<Merchant, MerchantQuery>({
    remote,
    fallback: localMerchantDataSource,
    // cache: merchantMmkvCache,  // ← S6 offline, non câblé
  });
}
