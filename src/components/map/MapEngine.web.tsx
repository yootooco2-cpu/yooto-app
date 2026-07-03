import { useEffect, useRef, useState } from 'react';

import 'mapbox-gl/dist/mapbox-gl.css';
import type { Map as MapboxMap } from 'mapbox-gl';

import { MapClusterController } from '@/components/map/cluster/clusterController';
import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { getMapConfig } from '@/features/map';
import type { MapEngineProps } from '@/features/map';

/** Délai de sécurité : au-delà, si la carte n'a pas chargé, on bascule en erreur (jamais infini). */
const LOAD_TIMEOUT_MS = 7000;

/**
 * Cartographic Engine — implémentation WEB (Mapbox GL JS + clustering natif).
 *
 * - `mapbox-gl` chargé dynamiquement (client-only) → SSR/export web safe.
 * - États explicites (loading/ready/error) + timeout de sécurité → jamais de chargement
 *   infini : si Mapbox échoue (token, réseau, exception), on affiche une erreur claire.
 * - Token absent → `MapPlaceholder` (fallback). Aucun impact natif / Expo Go.
 */
export function MapEngine({
  markers,
  selectedId,
  onSelectMarker,
  onViewportChange,
  userLocation,
  fill,
}: MapEngineProps) {
  const { token, styleUrl, defaultRegion } = getMapConfig();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const controllerRef = useRef<MapClusterController | null>(null);
  const onSelectRef = useRef(onSelectMarker);
  const onViewportRef = useRef(onViewportChange);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const ready = status === 'ready';

  // Garde les derniers handlers accessibles au contrôleur (sans recréer la carte).
  useEffect(() => {
    onSelectRef.current = onSelectMarker;
    onViewportRef.current = onViewportChange;
  });

  const centerLat = defaultRegion.center.latitude;
  const centerLng = defaultRegion.center.longitude;
  const zoom = defaultRegion.zoom;

  // --- Cycle de vie : carte + contrôleur de clustering ---
  useEffect(() => {
    if (!token || !containerRef.current) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    setStatus('loading');
    // eslint-disable-next-line no-console
    console.log('[YOOTOO/map] init');

    void (async () => {
      try {
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

        // Erreurs Mapbox (tuiles, style, réseau) → log non bloquant.
        map.on('error', (e: { error?: unknown }) => {
          // eslint-disable-next-line no-console
          console.error('[YOOTOO/map] error', e?.error ?? e);
        });

        // Émet le viewport courant (centre + zoom + emprise) — jamais bloquant.
        const emitViewport = (userInitiated: boolean) => {
          try {
            const b = map.getBounds();
            if (!b) return;
            const c = map.getCenter();
            onViewportRef.current?.(
              {
                center: { latitude: c.lat, longitude: c.lng },
                zoom: map.getZoom(),
                bounds: { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() },
              },
              userInitiated,
            );
            if (__DEV__) {
              // eslint-disable-next-line no-console
              console.log('[YOOTOO/map] viewport emitted', { zoom: Number(map.getZoom().toFixed(2)) });
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[YOOTOO/map] error (viewport emit)', err);
          }
        };

        map.on('load', () => {
          if (cancelled) return;
          if (timeout) clearTimeout(timeout);
          // eslint-disable-next-line no-console
          console.log('[YOOTOO/map] load');
          try {
            controllerRef.current = new MapClusterController(map, mapboxgl, (id) =>
              onSelectRef.current?.(id),
            );
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[YOOTOO/map] error (controller init)', err);
          }
          // `originalEvent` présent ⇒ geste utilisateur ; absent ⇒ programmatique.
          map.on('moveend', (e: { originalEvent?: unknown }) => emitViewport(Boolean(e.originalEvent)));
          // On passe READY AVANT d'émettre le viewport : une erreur d'émission ne bloque jamais la carte.
          setStatus('ready');
          emitViewport(false);
        });

        // Filet de sécurité : jamais de chargement infini.
        timeout = setTimeout(() => {
          if (cancelled || map.loaded()) return;
          // eslint-disable-next-line no-console
          console.error('[YOOTOO/map] error (timeout: carte non chargée en ' + LOAD_TIMEOUT_MS + 'ms)');
          setStatus('error');
        }, LOAD_TIMEOUT_MS);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[YOOTOO/map] error (init)', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      setStatus('loading');
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
      style={{
        position: 'relative',
        ...(fill ? { flex: 1, minHeight: 0 } : { height: 280 }),
        width: '100%',
        borderRadius: radii.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.border,
      }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {status === 'error' ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor: colors.background,
          }}>
          <span style={{ color: colors.text, textAlign: 'center', maxWidth: 320 }}>
            Carte momentanément indisponible. Vérifiez votre connexion, puis rechargez la page.
          </span>
        </div>
      ) : null}
    </div>
  );
}
