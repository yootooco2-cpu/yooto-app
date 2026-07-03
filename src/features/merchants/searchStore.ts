import { create } from 'zustand';

import type { MapCoordinate } from '@/features/map';

import type { QuickFilterId } from './filters';
import type { MerchantCategoryId } from './merchantCategoryFilters';

/**
 * État de recherche commerces PARTAGÉ entre les écrans Accueil, Carte et Commerçants.
 * Léger : recherche + filtres + position + catégorie active. `activeCategory` est la
 * SOURCE UNIQUE de la catégorie sélectionnée (l'Accueil la présélectionne au clic
 * d'une catégorie, la page Commerçants la consomme pour filtrer la grille).
 */
interface MerchantSearchState {
  search: string;
  activeFilters: QuickFilterId[];
  userLocation: MapCoordinate | null;
  activeCategory: MerchantCategoryId | null;
  setSearch: (search: string) => void;
  toggleFilter: (id: QuickFilterId) => void;
  setUserLocation: (location: MapCoordinate | null) => void;
  setActiveCategory: (id: MerchantCategoryId | null) => void;
}

export const useMerchantSearchStore = create<MerchantSearchState>()((set) => ({
  search: '',
  activeFilters: [],
  userLocation: null,
  activeCategory: null,
  setSearch: (search) => set({ search }),
  toggleFilter: (id) =>
    set((state) => ({
      activeFilters: state.activeFilters.includes(id)
        ? state.activeFilters.filter((filter) => filter !== id)
        : [...state.activeFilters, id],
    })),
  setUserLocation: (userLocation) => set({ userLocation }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
}));
