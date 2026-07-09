import { useEffect, useRef } from 'react';

import { useMerchantSearchStore } from '@/features/merchants/searchStore';

import { useLocationSimulationStore } from './locationSimulationStore';

/**
 * Applique la position SIMULÉE (DEV) à la position app-wide (`userLocation`) dès qu'elle change,
 * pour que TOUTE l'expérience (carte, distances, recommandations, producteurs proches, Discovery)
 * se comporte comme si l'utilisateur y était. À la désactivation : on relâche la position
 * (retour immédiat à la vraie géolocalisation). À monter une seule fois, très haut dans l'app.
 */
export function useLocationSimulationSync(): void {
  const enabled = useLocationSimulationStore((s) => s.enabled);
  const place = useLocationSimulationStore((s) => s.place);
  const setUserLocation = useMerchantSearchStore((s) => s.setUserLocation);
  const wasEnabled = useRef(false);

  useEffect(() => {
    if (!__DEV__) return;
    if (enabled && place) {
      setUserLocation({ latitude: place.latitude, longitude: place.longitude });
    } else if (wasEnabled.current) {
      // Désactivation : on efface la position simulée → la vraie géoloc reprend la main.
      setUserLocation(null);
    }
    wasEnabled.current = enabled;
  }, [enabled, place, setUserLocation]);
}
