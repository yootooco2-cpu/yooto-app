import { useCallback, useState } from 'react';

import { LocationSimulationService } from '@/services/LocationSimulationService';

import type { LocationPermissionStatus, UserCoordinates } from './types';

/**
 * Permission / lecture de localisation YOOTOO — ponctuelle et à la demande.
 *
 * TOUTE demande passe par `LocationSimulationService.getCurrentLocation()`, qui décide de la
 * source de vérité : position SIMULÉE (mode dev) ou vraie géolocalisation GPS. Le hook n'a plus
 * à connaître la source — il ne fait qu'exposer un statut simple à l'UI (soft-ask, halo…).
 */
export function useLocationPermission() {
  const [status, setStatus] = useState<LocationPermissionStatus>('idle');
  const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null);

  const request = useCallback(async (): Promise<UserCoordinates | null> => {
    setStatus('requesting');
    const coords = await LocationSimulationService.getCurrentLocation();
    if (!coords) {
      setStatus('denied');
      return null;
    }
    setCoordinates(coords);
    setStatus('granted');
    return coords;
  }, []);

  return { status, coordinates, request };
}
