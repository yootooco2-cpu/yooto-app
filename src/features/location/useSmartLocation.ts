import { useCallback, useEffect, useState } from 'react';

import type { MapCoordinate } from '@/features/map';

import { useLocationPermission } from './useLocationPermission';

/** Délai avant l'apparition de la carte soft-ask (jamais au lancement). */
const SOFT_ASK_DELAY_MS = 3500;

interface Params {
  /** Position utilisateur connue (source partagée) — pilote l'affichage du soft-ask. */
  userLocation: MapCoordinate | null;
  /** Callback quand une position est obtenue (l'appelant la stocke). */
  onLocate: (coord: MapCoordinate) => void;
}

/**
 * Orchestration de la localisation « intelligente » (PR1) :
 *  - carte soft-ask après un court délai (jamais au lancement, dismissable) ;
 *  - `authorize()` déclenche le dialogue système UNIQUEMENT au tap explicite ;
 *  - `recenter()` émet un jeton de recentrage (vol vers l'utilisateur) ;
 *  - un seul `getCurrentPositionAsync` (aucun tracking) via `useLocationPermission`.
 */
export function useSmartLocation({ userLocation, onLocate }: Params) {
  const { status, request } = useLocationPermission();
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);

  // Soft-ask : apparaît après un court délai — jamais si déjà localisé, refusé ou écarté.
  useEffect(() => {
    if (dismissed || userLocation || status !== 'idle') return;
    const timer = setTimeout(() => setShowPrompt(true), SOFT_ASK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [dismissed, userLocation, status]);

  // Dès qu'une position est connue (par ce flux ou le chip « Autour de moi »), on masque la carte.
  useEffect(() => {
    if (userLocation) setShowPrompt(false);
  }, [userLocation]);

  const authorize = useCallback(async () => {
    setShowPrompt(false);
    const coords = await request();
    if (coords) {
      onLocate({ latitude: coords.latitude, longitude: coords.longitude });
      setAccuracy(typeof coords.accuracy === 'number' ? coords.accuracy : null);
    }
    // Refus → aucune position → repli Montpellier (rien à faire ici).
  }, [request, onLocate]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setShowPrompt(false);
  }, []);

  const recenter = useCallback(() => setRecenterToken((v) => v + 1), []);

  return { showPrompt, authorize, dismiss, recenter, recenterToken, accuracy, status };
}
