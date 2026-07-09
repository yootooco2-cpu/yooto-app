import { create } from 'zustand';

/** Un point de simulation GPS (DEV) : libellé lisible + coordonnées. */
export interface SimulatedPlace {
  label: string;
  latitude: number;
  longitude: number;
}

/**
 * Points favoris pour les tests géographiques terrain (Montpellier & alentours). Sert de base à
 * l'outil officiel de simulation GPS pendant tout le développement de YOOTOO.
 */
export const SIMULATION_PRESETS: SimulatedPlace[] = [
  { label: 'Place de la Comédie (Montpellier)', latitude: 43.6081, longitude: 3.8797 },
  { label: 'Écusson (Montpellier)', latitude: 43.6112, longitude: 3.8772 },
  { label: 'Gare Saint-Roch (Montpellier)', latitude: 43.6046, longitude: 3.8806 },
  { label: 'Quissac', latitude: 43.9161, longitude: 3.9836 },
  { label: 'Nîmes', latitude: 43.8383, longitude: 4.36 },
  { label: 'Clermont-Ferrand', latitude: 45.7772, longitude: 3.0863 },
];

interface LocationSimulationState {
  /** Simulation active (DEV uniquement). */
  enabled: boolean;
  /** Point simulé courant (défaut : Place de la Comédie). */
  place: SimulatedPlace | null;
  setEnabled: (enabled: boolean) => void;
  setPlace: (place: SimulatedPlace | null) => void;
}

/**
 * État de la simulation GPS. Volontairement NON persisté (outil de dev, réinitialisé à chaque
 * session). `LocationSimulationService` est l'API publique ; ce store en est le socle réactif.
 */
export const useLocationSimulationStore = create<LocationSimulationState>()((set) => ({
  enabled: false,
  place: SIMULATION_PRESETS[0],
  setEnabled: (enabled) => set({ enabled }),
  setPlace: (place) => set({ place }),
}));
