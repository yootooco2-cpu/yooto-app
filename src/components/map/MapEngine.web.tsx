import { useEffect, useRef, useState } from 'react';

import 'mapbox-gl/dist/mapbox-gl.css';
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';

import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { getMapConfig } from '@/features/map';
import type { MapCoordinate, MapEngineProps } from '@/features/map';

const USER_MARKER_KEY = '__user__';

/** Bornes France métropolitaine — au-delà, coordonnée jugée invalide/aberrante. */
const FRANCE_BOUNDS = { minLat: 41, maxLat: 51.6, minLng: -5.6, maxLng: 9.9 };
/** Amplitude max (degrés) d'une bbox « cadrable ». Au-delà → région par défaut. */
const MAX_BBOX_SPAN_DEG = 2.5;

function isPlausibleCoordinate(c: MapCoordinate): boolean {
  return (
    c.latitude >= FRANCE_BOUNDS.minLat &&
    c.latitude <= FRANCE_BOUNDS.maxLat &&
    c.longitude >= FRANCE_BOUNDS.minLng &&
    c.longitude <= FRANCE_BOUNDS.maxLng
  );
}

function styleBaseMarker(el: HTMLDivElement) {
  el.style.width = '16px';
  el.style.height = '16px';
  el.style.borderRadius = '8px';
  el.style.borderWidth = '2px';
  el.style.borderStyle = 'solid';
  el.style.cursor = 'pointer';
  el.style.boxShadow = '0 1px 4px rgba(23,32,26,0.35)';
  el.style.transition = 'transform 0.1s ease';
}

function styleMerchantMarker(el: HTMLDivElement, active: boolean) {
  el.style.background = active ? colors.primary : colors.surface;
  el.style.borderColor = active ? colors.primary : colors.text;
  el.style.transform = active ? 'scale(1.35)' : 'scale(1)';
  el.style.zIndex = active ? '3' : '1';
}

/**
 * Cartographic Engine — implémentation WEB (Mapbox GL JS).
 *
 * - `mapbox-gl` chargé en import dynamique (client-only) → SSR/export web safe.
 * - Token lu via `getMapConfig()` ; ABSENT → `MapPlaceholder` (fallback automatique).
 * - PRÉSENT → vraie carte : tous les marqueurs, cadrage auto (fitBounds), sélection
 *   liste ↔ carte sans reconstruction, position GPS. Aucun impact natif / Expo Go.
 */
export function MapEngine({ markers, selectedId, onSelectMarker, userLocation, fill }: MapEngineProps) {
  const { token, styleUrl, defaultRegion } = getMapConfig();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markersRef = useRef<Map<string, MapboxMarker>>(new Map());
  const elementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const selectedRef = useRef<string | null | undefined>(selectedId);
  const [ready, setReady] = useState(false);

  const centerLat = defaultRegion.center.latitude;
  const centerLng = defaultRegion.center.longitude;
  const zoom = defaultRegion.zoom;

  // Garde la dernière sélection accessible aux effets (sans relancer le build).
  useEffect(() => {
    selectedRef.current = selectedId;
  });

  // --- Cycle de vie de la carte ---
  useEffect(() => {
    if (!token || !containerRef.current) return;
    let cancelled = false;
    let map: MapboxMap | null = null;
    const markersMap = markersRef.current;
    const elementsMap = elementsRef.current;

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
      markersMap.forEach((marker) => marker.remove());
      markersMap.clear();
      elementsMap.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, [token, styleUrl, centerLat, centerLng, zoom]);

  // --- Marqueurs + cadrage (PAS de reconstruction à la sélection) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!token || !ready || !map) return;
    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      if (cancelled) return;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      elementsRef.current.clear();

      const bounds = new mapboxgl.LngLatBounds();
      // On ignore les coordonnées aberrantes (hors France) pour la bbox ET l'affichage.
      const plottable = markers.filter((marker) => isPlausibleCoordinate(marker.coordinate));

      plottable.forEach((marker) => {
        const el = document.createElement('div');
        styleBaseMarker(el);
        styleMerchantMarker(el, marker.id === selectedRef.current);
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          onSelectMarker?.(marker.id);
        });
        const glMarker = new mapboxgl.Marker({ element: el })
          .setLngLat([marker.coordinate.longitude, marker.coordinate.latitude])
          .addTo(map);
        markersRef.current.set(marker.id, glMarker);
        elementsRef.current.set(marker.id, el);
        bounds.extend([marker.coordinate.longitude, marker.coordinate.latitude]);
      });

      const userCoord =
        userLocation && isPlausibleCoordinate(userLocation) ? userLocation : null;
      if (userCoord) {
        const el = document.createElement('div');
        styleBaseMarker(el);
        el.style.background = colors.accent;
        el.style.borderColor = '#FFFFFF';
        const glMarker = new mapboxgl.Marker({ element: el })
          .setLngLat([userCoord.longitude, userCoord.latitude])
          .addTo(map);
        markersRef.current.set(USER_MARKER_KEY, glMarker);
        bounds.extend([userCoord.longitude, userCoord.latitude]);
      }

      // Cadrage : bbox propre si raisonnable ; sinon repli sur la zone YOOTOO.
      if (bounds.isEmpty()) {
        map.jumpTo({ center: [centerLng, centerLat], zoom });
      } else {
        const latSpan = bounds.getNorth() - bounds.getSouth();
        const lngSpan = bounds.getEast() - bounds.getWest();
        if (latSpan > MAX_BBOX_SPAN_DEG || lngSpan > MAX_BBOX_SPAN_DEG) {
          // Commerces trop dispersés (échelle nationale) → on ne montre pas toute la France.
          if (userCoord) {
            map.jumpTo({ center: [userCoord.longitude, userCoord.latitude], zoom: 12 });
          } else {
            map.jumpTo({ center: [centerLng, centerLat], zoom });
          }
        } else {
          map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, markers, userLocation, token, onSelectMarker, centerLat, centerLng, zoom]);

  // --- Sélection liste ↔ carte : restyle sans reconstruire les marqueurs ---
  useEffect(() => {
    elementsRef.current.forEach((el, id) => styleMerchantMarker(el, id === selectedId));
  }, [selectedId]);

  // Sans token → fallback universel (web toujours fonctionnel).
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
