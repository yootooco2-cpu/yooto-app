import { useCallback, useState } from 'react';

import type { LocationPermissionStatus, UserCoordinates } from './types';

/**
 * Permission de localisation YOOTOO — ponctuelle et à la demande.
 *
 * - `expo-location` est importé dynamiquement (web-safe : aucun accès à `navigator`
 *   au chargement du module, donc pas de casse au rendu statique web).
 * - On utilise uniquement `getCurrentPositionAsync` : AUCUN tracking permanent
 *   (pas de `watchPositionAsync`). La position n'est lue qu'au moment où
 *   l'utilisateur le demande explicitement.
 */
export function useLocationPermission() {
  const [status, setStatus] = useState<LocationPermissionStatus>('idle');
  const [coordinates, setCoordinates] = useState<UserCoordinates | null>(null);

  const request = useCallback(async (): Promise<UserCoordinates | null> => {
    try {
      setStatus('requesting');
      const Location = await import('expo-location');

      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        setStatus('denied');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next: UserCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoordinates(next);
      setStatus('granted');
      return next;
    } catch {
      setStatus('denied');
      return null;
    }
  }, []);

  return { status, coordinates, request };
}
