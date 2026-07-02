import { useEffect, useRef, useState } from 'react';

import 'mapbox-gl/dist/mapbox-gl.css';
import type { Map as MapboxMap } from 'mapbox-gl';

import { MapClusterController } from '@/components/map/cluster/clusterController';
import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { getMapConfig } from '@/features/map';
import type { MapEngineProps } from '@/features/map';

/**
 * Cartographic Engine — implémentation WEB (Mapbox GL JS + clustering natif).
 *
 * - `mapbox-gl` chargé dynamiquement (client-only) → SSR/export web safe.
 * - Tout le rendu (clusters + comptage) est porté par GL JS ; seuls les commerces
 *   visibles non clusterisés deviennent des marqueurs photo HTML (pool borné).
 * - Token absent → `MapPlaceholder` (fallback). Aucun impact natif / Expo Go.
 */
export function MapEngine({ markers, selectedId, onSelectMarker, userLocation, fill }: MapEngineProps) {
  const { token, styleUrl, defaultRegion } = getMapConfig();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const controllerRef = useRef<MapClusterController | null>(null);
  const onSelectRef = useRef(onSelectMarker);
  const [ready, setReady] = useState(false);

  // Garde le dernier handler de sélection accessible au contrôleur (sans recréer la carte).
  useEffect(() => {
    onSelectRef.current = onSelectMarker;
  });

  const centerLat = defaultRegion.center.latitude;
  const centerLng = defaultRegion.center.longitude;
  const zoom = defaultRegion.zoom;

  // --- Cycle de vie : carte + contrôleur de clustering ---
  useEffect(() => {
    if (!token || !containerRef.current) return;
    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [centerLng, centerLat],
        zoom,
      });
      mapRef.current = map;
      map.on('load', () => {
        if (cancelled) return;
        controllerRef.current = new MapClusterController(map, mapboxgl, (id) =>
          onSelectRef.current?.(id),
        );
        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
      setReady(false);
      controllerRef.current?.destroy();
      controllerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, styleUrl, centerLat, centerLng, zoom]);

  // --- Données (commerces + position) : mise à jour sans recharge ---
  useEffect(() => {
    if (!ready || !controllerRef.current) return;
    controllerRef.current.setData(markers, userLocation);
  }, [ready, markers, userLocation]);

  // --- Sélection : restyle sans reconstruire la carte ---
  useEffect(() => {
    if (!ready || !controllerRef.current) return;
    controllerRef.current.setSelected(selectedId ?? null);
  }, [ready, selectedId]);

  if (!token) {
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

  return (
    <div
      ref={containerRef}
      style={{
        ...(fill ? { flex: 1, minHeight: 0 } : { height: 280 }),
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
