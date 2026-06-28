import { useQuery } from '@tanstack/react-query';

import { getMerchantRepository } from './repository';
import type { MerchantQuery } from './types';

/** Clés de cache TanStack Query pour les commerces. */
export const merchantKeys = {
  all: ['merchants'] as const,
  list: (query?: MerchantQuery) => ['merchants', 'list', query ?? null] as const,
  detail: (id: string) => ['merchants', 'detail', id] as const,
};

/** Liste des commerces filtrée/triée (Supabase ou fallback local). */
export function useMerchants(query?: MerchantQuery) {
  return useQuery({
    queryKey: merchantKeys.list(query),
    queryFn: () => getMerchantRepository().list(query),
  });
}

/** Un commerce par id. */
export function useMerchant(id: string) {
  return useQuery({
    queryKey: merchantKeys.detail(id),
    queryFn: () => getMerchantRepository().getById(id),
    enabled: Boolean(id),
  });
}
