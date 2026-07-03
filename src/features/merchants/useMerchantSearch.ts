import { useEffect, useMemo } from 'react';

import {
  buildDiscoveryContext,
  recommendCached,
  resolveIntent,
  trackEvent,
  usePreferences,
} from '@/features/discovery';
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
    // Apprentissage léger : sélectionner un filtre enrichit les préférences.
    if (willEnable) {
      trackEvent({ type: 'filter_selected', category: id === 'producers' ? 'producer' : undefined });
    }
    // « Autour de moi » : demande GPS ponctuelle, puis mémorise la position partagée.
    if (id === 'nearby' && willEnable && !userLocation) {
      void location.request().then((coords) => {
        if (coords) setUserLocation(coords);
      });
    }
  };

  // Intention déduite de la recherche (élargit le filtrage ET enrichit le score).
  const intent = useMemo(() => resolveIntent(search), [search]);

  // Apprentissage léger : une recherche reconnue est un signal d'engagement.
  useEffect(() => {
    if (intent) trackEvent({ type: 'search_used' });
  }, [intent]);

  const merchantQuery = useMemo<MerchantQuery>(
    () => ({
      search: search.trim() || undefined,
      filters,
      near: nearbyActive ? (userLocation ?? undefined) : undefined,
      intent,
    }),
    [search, filters, nearbyActive, userLocation, intent],
  );

  const { data, isLoading, isError, refetch } = useMerchants(merchantQuery);
  const filtered = useMemo(() => data ?? [], [data]);

  // L'ORDRE est décidé par le Discovery Engine (point d'entrée unique).
  // Le repository fournit l'ensemble filtré ; le moteur classe par pertinence.
  const preferences = usePreferences();
  const discoveryContext = useMemo(
    () => buildDiscoveryContext({ userLocation, intent, preferences }),
    [userLocation, intent, preferences],
  );
  const results = useMemo(
    () => recommendCached(filtered, discoveryContext).map((scored) => scored.merchant),
    [filtered, discoveryContext],
  );
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
