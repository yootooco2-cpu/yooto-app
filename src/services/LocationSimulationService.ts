import {
  SIMULATION_PRESETS,
  useLocationSimulationStore,
  type SimulatedPlace,
} from '@/features/location/locationSimulationStore';
import type { UserCoordinates } from '@/features/location/types';

/**
 * Lecture GPS RÉELLE — import dynamique web-safe (aucun accès `navigator` au chargement du module),
 * ponctuelle, sans tracking (`getCurrentPositionAsync` uniquement). Renvoie `null` si refusée/échec.
 */
async function readRealLocation(): Promise<UserCoordinates | null> {
  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * LocationSimulationService — SOURCE DE VÉRITÉ de la position pendant le développement.
 *
 * Quand la simulation est activée (DEV), toute demande de localisation renvoie la position simulée ;
 * sinon, la vraie géolocalisation. Le reste de l'application ne sait JAMAIS si la position est réelle
 * ou simulée : c'est le service qui décide. La simulation est strictement réservée au développement
 * (`__DEV__`) — inerte en production.
 */
export const LocationSimulationService = {
  /** Points favoris pour les tests géographiques. */
  presets: SIMULATION_PRESETS,

  /** La simulation n'est disponible qu'en développement. */
  isAvailable: (): boolean => __DEV__,

  /** Vrai si une position simulée est actuellement injectée. */
  isSimulating: (): boolean => __DEV__ && useLocationSimulationStore.getState().enabled,

  /** Point simulé courant (indépendamment de l'activation). */
  getSimulatedPlace: (): SimulatedPlace | null => useLocationSimulationStore.getState().place,

  /** Active la simulation (utilise le point courant). Inerte hors DEV. */
  enableSimulation(): void {
    if (!__DEV__) return;
    useLocationSimulationStore.getState().setEnabled(true);
  },

  /** Désactive la simulation → retour immédiat à la vraie géolocalisation. */
  disableSimulation(): void {
    useLocationSimulationStore.getState().setEnabled(false);
  },

  /** Définit ET active un point simulé. Inerte hors DEV. */
  setSimulatedLocation(latitude: number, longitude: number, label: string): void {
    if (!__DEV__) return;
    const store = useLocationSimulationStore.getState();
    store.setPlace({ latitude, longitude, label });
    store.setEnabled(true);
  },

  /**
   * Position courante — le service choisit la source : simulée si activée (DEV), sinon vrai GPS.
   * TOUTES les demandes de localisation de l'app passent par ici (via `useLocationPermission`).
   */
  async getCurrentLocation(): Promise<UserCoordinates | null> {
    const { enabled, place } = useLocationSimulationStore.getState();
    if (__DEV__ && enabled && place) {
      return { latitude: place.latitude, longitude: place.longitude, accuracy: 5 };
    }
    return readRealLocation();
  },
};
