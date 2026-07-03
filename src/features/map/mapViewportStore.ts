import { create } from 'zustand';

import type { MapViewport } from './types';

/**
 * Persistance du viewport carte — EN MÉMOIRE, portée SESSION uniquement.
 * Aucune persistance disque (pas d'AsyncStorage) : l'état est perdu au kill de l'app,
 * mais survit aux remounts (retour de fiche, changement d'onglet) → on retrouve le
 * dernier centre + zoom.
 */
interface MapViewportState {
  lastViewport: MapViewport | null;
  setLastViewport: (viewport: MapViewport) => void;
}

export const useMapViewportStore = create<MapViewportState>()((set) => ({
  lastViewport: null,
  setLastViewport: (lastViewport) => set({ lastViewport }),
}));
