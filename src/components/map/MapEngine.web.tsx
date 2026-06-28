import { useEffect, useRef, useState } from 'react';

import 'mapbox-gl/dist/mapbox-gl.css';
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';

import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { getMapConfig } from '@/features/map';
import type { MapEngineProps } from '@/features/map';

/**
 * Cartographic Engine — implémentation WEB (Mapbox GL JS).
 * Metro résout ce fichier sur web (override de `MapEngine.tsx`).
 *
 * - `mapbox-gl` est chargé en **import dynamique** dans les effets (client-only)
 *   → aucun accès à `window` au chargement du module : rendu statique web SSR-safe.
 * - Token lu UNIQUEMENT via `getMapConfig()`.
 * - Token absent → `MapPlaceholder` (aucun crash, web toujours fonctionnel).
 * - Aucun impact natif / Expo Go (fichier web uniquement).
 */
export function MapEngine({ markers, selectedId, onSelectMarker, userLocation }: MapEngineProps) {
  const { token, styleUrl, defaultRegion } = getMapConfig();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const glMarkersRef = useRef<MapboxMarker[]>([]);
  const [ready, setReady] = useState(false);

  const centerLat = defaultRegion.center.latitude;
  const centerLng = defaultRegion.center.longitude;
  const zoom = defaultRegion.zoom;

  // --- Cycle de vie de la carte (création / destruction) ---
  useEffect(() => {
    if (!token || !containerRef.current) return;

    let cancelled = false;
    let map: MapboxMap | null = null;

    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [centerLng, centerLat],
        zoom,
      });
      mapRef.current = map;
      map.on('load', () => {
        if (!cancelled) setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      setReady(false);
      glMarkersRef.current.forEach((marker) => marker.remove());
      glMarkersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, [token, styleUrl, centerLat, centerLng, zoom]);

  // --- Synchronisation des marqueurs (commerces + position utilisateur) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!token || !ready || !map) return;

    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (cancelled) return;

      glMarkersRef.current.forEach((marker) => marker.remove());
      glMarkersRef.current = [];

      markers.forEach((marker) => {
        const glMarker = new mapboxgl.Marker({
          color: marker.id === selectedId ? colors.primary : colors.text,
        })
          .setLngLat([marker.coordinate.longitude, marker.coordinate.latitude])
          .addTo(map);
        glMarker.getElement().addEventListener('click', () => onSelectMarker?.(marker.id));
        glMarkersRef.current.push(glMarker);
      });

      if (userLocation) {
        const userMarker = new mapboxgl.Marker({ color: colors.accent })
          .setLngLat([userLocation.longitude, userLocation.latitude])
          .addTo(map);
        glMarkersRef.current.push(userMarker);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, markers, selectedId, userLocation, onSelectMarker, token]);

  // Sans token → fallback universel (web toujours fonctionnel).
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

  return (
    <div
      ref={containerRef}
      style={{
        height: 280,
        width: '100%',
        borderRadius: radii.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.border,
      }}
    />
  );
}
