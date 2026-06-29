import { create } from 'zustand';

import type { MapCoordinate } from '@/features/map';

import type { QuickFilterId } from './filters';

/**
 * État de recherche commerces PARTAGÉ entre les écrans Carte et Commerçants.
 * Léger : seulement recherche + filtres + position (GPS ponctuel mémorisée).
 */
interface MerchantSearchState {
  search: string;
  activeFilters: QuickFilterId[];
  userLocation: MapCoordinate | null;
  setSearch: (search: string) => void;
  toggleFilter: (id: QuickFilterId) => void;
  setUserLocation: (location: MapCoordinate | null) => void;
}

export const useMerchantSearchStore = create<MerchantSearchState>()((set) => ({
  search: '',
  activeFilters: [],
  userLocation: null,
  setSearch: (search) => set({ search }),
  toggleFilter: (id) =>
    set((state) => ({
      activeFilters: state.activeFilters.includes(id)
        ? state.activeFilters.filter((filter) => filter !== id)
        : [...state.activeFilters, id],
    })),
  setUserLocation: (userLocation) => set({ userLocation }),
}));
