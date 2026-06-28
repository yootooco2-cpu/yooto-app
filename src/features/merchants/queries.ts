import { useQuery } from '@tanstack/react-query';

import { getMerchantRepository } from './repository';

/** Clés de cache TanStack Query pour les commerces. */
export const merchantKeys = {
  all: ['merchants'] as const,
  detail: (id: string) => ['merchants', id] as const,
};

/** Liste des commerces (Supabase ou fallback local), avec cache/loading/error. */
export function useMerchants() {
  return useQuery({
    queryKey: merchantKeys.all,
    queryFn: () => getMerchantRepository().list(),
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
