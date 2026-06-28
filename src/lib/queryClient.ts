import { QueryClient } from '@tanstack/react-query';

/** Instance TanStack Query partagée (montée dans le root layout). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
