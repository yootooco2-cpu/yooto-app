import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import type { MapEngineProps } from '@/features/map';

/**
 * Cartographic Engine — implémentation par défaut / NATIVE (iOS + Android).
 * Metro résout ce fichier sur natif ; `MapEngine.web.tsx` le remplace sur web.
 *
 * S4 : aucun provider branché → rendu via `MapPlaceholder` (fallback universel).
 * S4.2 : remplacer le corps par `@rnmapbox/maps` quand un token est présent.
 */
export function MapEngine({ markers, selectedId, onSelectMarker, userLocation, fill }: MapEngineProps) {
  // TODO S4.2 — @rnmapbox/maps (dev build requis). Fallback placeholder en attendant.
  return (
    <MapPlaceholder
      markers={markers}
      selectedId={selectedId}
      onSelectMarker={onSelectMarker}
      userLocation={userLocation}
      fill={fill}
    />
  );
}
