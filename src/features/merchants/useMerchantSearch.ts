import { useEffect, useMemo } from 'react';

import {
  buildDiscoveryContext,
  editorialDiversification,
  rankMerchantsEditorially,
  recommendCached,
  resolveIntent,
  trackEvent,
  usePreferences,
} from '@/features/discovery';
import { useLocationPermission } from '@/features/location';

import type { QuickFilterId } from './filters';
import { applyMerchantQueryLocal } from './merchantQuery';
import { useMerchants } from './queries';
import { useMerchantSearchStore } from './searchStore';
import { merchantsToMapMarkers } from './toMapMarkers';
import type { MerchantQuery } from './types';
import { useDebouncedValue } from './useDebouncedValue';

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

  // Recherche instantanée : debounce léger de la saisie → lisse l'intention et le
  // re-classement pendant la frappe, sans jamais déclencher de requête réseau.
  const debouncedSearch = useDebouncedValue(search, 200);

  // Intention déduite de la recherche (élargit le filtrage ET enrichit le score).
  const intent = useMemo(() => resolveIntent(debouncedSearch), [debouncedSearch]);

  // Apprentissage léger : une recherche reconnue est un signal d'engagement.
  useEffect(() => {
    if (intent) trackEvent({ type: 'search_used' });
  }, [intent]);

  const merchantQuery = useMemo<MerchantQuery>(
    () => ({
      search: debouncedSearch.trim() || undefined,
      filters,
      near: nearbyActive ? (userLocation ?? undefined) : undefined,
      intent,
    }),
    [debouncedSearch, filters, nearbyActive, userLocation, intent],
  );

  // FETCH-ONCE : le corpus actif est chargé UNE seule fois (clé React Query STABLE, sans
  // recherche ni filtres) → aucune requête réseau à la frappe.
  const { data, isLoading, isError, refetch } = useMerchants();
  const corpus = useMemo(() => data ?? [], [data]);

  // FILTRAGE INSTANTANÉ EN MÉMOIRE : recherche + filtres + distance appliqués côté client.
  const queried = useMemo(
    () => applyMerchantQueryLocal(corpus, merchantQuery),
    [corpus, merchantQuery],
  );

  // L'ORDRE est décidé par le Discovery Engine (point d'entrée unique) sur l'ensemble filtré.
  const preferences = usePreferences();
  const discoveryContext = useMemo(
    () => buildDiscoveryContext({ userLocation, intent, preferences }),
    [userLocation, intent, preferences],
  );
  // Ranking éditorial YOOTOO en clé PRIMAIRE (helper UNIQUE, partagé Accueil/Carte/Commerçants),
  // appliqué APRÈS le filtrage recherche/filtres. Tri STABLE : l'ordre du Discovery Engine
  // (pertinence/intent) départage les ex æquo. Élevages/pompes funèbres/couvreurs rétrogradés.
  // Ranking éditorial (moteur UNIQUE) PUIS diversification LÉGÈRE des premières cartes (Carte +
  // Commerçants) : évite un mur d'une même famille en tête, sans remonter un commerce moins bon
  // et sans toucher le classement profond (au-delà de la fenêtre = ordre éditorial exact).
  const results = useMemo(
    () =>
      editorialDiversification(
        rankMerchantsEditorially(recommendCached(queried, discoveryContext).map((s) => s.merchant)),
        { window: 20 },
      ),
    [queried, discoveryContext],
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
