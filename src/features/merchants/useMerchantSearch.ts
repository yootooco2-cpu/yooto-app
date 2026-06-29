import { useMemo } from 'react';

import { useLocationPermission } from '@/features/location';

import type { QuickFilterId } from './filters';
import { useMerchants } from './queries';
import { useMerchantSearchStore } from './searchStore';
import { merchantsToMapMarkers } from './toMapMarkers';
import type { MerchantQuery } from './types';

/**
 * État de recherche/filtres/GPS + données commerces, PARTAGÉ entre les écrans
 * Carte et Commerçants via le store Zustand. GPS ponctuel uniquement.
 */
export function useMerchantSearch() {
  const search = useMerchantSearchStore((state) => state.search);
  const setSearch = useMerchantSearchStore((state) => state.setSearch);
  const filters = useMerchantSearchStore((state) => state.activeFilters);
  const toggleFilterInStore = useMerchantSearchStore((state) => state.toggleFilter);
  const userLocation = useMerchantSearchStore((state) => state.userLocation);
  const setUserLocation = useMerchantSearchStore((state) => state.setUserLocation);

  const location = useLocationPermission();
  const nearbyActive = filters.includes('nearby');

  const toggleFilter = (id: QuickFilterId) => {
    const willEnable = !filters.includes(id);
    toggleFilterInStore(id);
    // « Autour de moi » : demande GPS ponctuelle, puis mémorise la position partagée.
    if (id === 'nearby' && willEnable && !userLocation) {
      void location.request().then((coords) => {
        if (coords) setUserLocation(coords);
      });
    }
  };

  const merchantQuery = useMemo<MerchantQuery>(
    () => ({
      search: search.trim() || undefined,
      filters,
      near: nearbyActive ? (userLocation ?? undefined) : undefined,
    }),
    [search, filters, nearbyActive, userLocation],
  );

  const { data, isLoading, isError, refetch } = useMerchants(merchantQuery);
  const results = useMemo(() => data ?? [], [data]);
  const markers = useMemo(() => merchantsToMapMarkers(results), [results]);

  return {
    query: search,
    setQuery: setSearch,
    filters,
    toggleFilter,
    location,
    userLocation,
    nearbyActive,
    results,
    markers,
    isLoading,
    isError,
    refetch,
  };
}
