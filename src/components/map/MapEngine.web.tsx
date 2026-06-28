import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { getMapConfig } from '@/features/map';
import type { MapEngineProps } from '@/features/map';

/**
 * Cartographic Engine — implémentation WEB.
 * Metro résout ce fichier sur web (override de `MapEngine.tsx`).
 *
 * S4 : aucun provider branché → rendu via `MapPlaceholder` (fallback universel).
 * S4.1 : remplacer le corps par Mapbox GL JS (import dynamique client-only,
 *        SSR-safe) quand un token est présent.
 */
export function MapEngine({ markers, selectedId, onSelectMarker, userLocation }: MapEngineProps) {
  const { token } = getMapConfig();

  // Sans token → fallback. (Le provider web réel arrivera en S4.1.)
  if (!token) {
    return (
      <MapPlaceholder
        markers={markers}
        selectedId={selectedId}
        onSelectMarker={onSelectMarker}
        userLocation={userLocation}
      />
    );
  }

  // TODO S4.1 — Mapbox GL JS (lazy import, SSR-safe). Fallback en attendant.
  return (
    <MapPlaceholder
      markers={markers}
      selectedId={selectedId}
      onSelectMarker={onSelectMarker}
      userLocation={userLocation}
    />
  );
}
