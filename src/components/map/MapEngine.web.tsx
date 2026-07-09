import { useEffect, useRef, useState } from 'react';

import 'mapbox-gl/dist/mapbox-gl.css';
import type { Map as MapboxMap } from 'mapbox-gl';

import { MapboxCameraBridge } from '@/components/map/camera/mapboxCameraBridge';
import { MapClusterController } from '@/components/map/cluster/clusterController';
import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { getMapConfig } from '@/features/map';
import type { MapEngineProps } from '@/features/map';
import { installVegetationScatter } from '@/features/map/prototype/vegetationScatter';
import {
  CameraScheduler,
  resolveCameraPlan,
  type CameraContext,
  type CameraIntent,
  type SchedulerTimer,
} from '@/features/map/camera';

/** Délai de sécurité : au-delà, si la carte n'a pas chargé, on bascule en erreur (jamais infini). */
const LOAD_TIMEOUT_MS = 7000;

/** Préférence d'accessibilité — le Scheduler transforme alors tout mouvement en saut. */
const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Horloge réelle injectée dans le Scheduler (coalescing). */
const realTimer: SchedulerTimer = {
  setTimer: (ms, cb) => {
    const id = setTimeout(cb, ms);
    return () => clearTimeout(id);
  },
};

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
  userAccuracy,
  recenterToken,
  initialCamera,
  fill,
}: MapEngineProps) {
  const { token, mapStyle, defaultRegion } = getMapConfig();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const controllerRef = useRef<MapClusterController | null>(null);
  const onSelectRef = useRef(onSelectMarker);
  const onViewportRef = useRef(onViewportChange);
  // Spatial Engine : toute la caméra passe par le Camera Engine (aucun `flyTo` direct).
  const cameraRef = useRef<{
    scheduler: CameraScheduler;
    request: (intent: CameraIntent, context: CameraContext) => void;
  } | null>(null);
  const markersRef = useRef(markers);
  const userLocationRef = useRef(userLocation);
  const prevSelectedRef = useRef<string | null | undefined>(undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const ready = status === 'ready';

  // Garde les derniers handlers/données accessibles aux effets caméra (sans recréer la carte).
  useEffect(() => {
    onSelectRef.current = onSelectMarker;
    onViewportRef.current = onViewportChange;
    markersRef.current = markers;
    userLocationRef.current = userLocation;
  });

  // Caméra initiale : viewport restauré (session) s'il existe, sinon région par défaut.
  // Capturée une fois au montage → aucune recréation de carte si le store change ensuite.
  const restoredCameraRef = useRef(initialCamera);
  const camera = restoredCameraRef.current ?? defaultRegion;
  const hasRestoredCamera = Boolean(restoredCameraRef.current);
  const centerLat = camera.center.latitude;
  const centerLng = camera.center.longitude;
  const zoom = camera.zoom;
  // R3 — ouverture cinématique : on garde TOUJOURS la vue oblique d'ouverture (un peu
  // d'horizon = meilleur repérage). Un viewport restauré ne porte pas de pitch → on retombe
  // sur le pitch/bearing du DEFAULT_REGION plutôt qu'à plat (« vue satellite »).
  const pitch = camera.pitch ?? defaultRegion.pitch ?? 0;
  const bearing = camera.bearing ?? defaultRegion.bearing ?? 0;

  // --- Cycle de vie : carte + contrôleur de clustering ---
  useEffect(() => {
    if (!token || !containerRef.current) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    setStatus('loading');

    void (async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: mapStyle as string,
          center: [centerLng, centerLat],
          zoom,
          pitch,
          bearing,
        });
        mapRef.current = map;

        // Erreurs Mapbox (tuiles, style, réseau) → log non bloquant. Un ÉCHEC DE STYLE est
        // remonté explicitement (statut error) : jamais de repli silencieux vers un style Mapbox.
        map.on('error', (e: { error?: unknown }) => {
          const msg = e?.error instanceof Error ? e.error.message : String(e?.error ?? '');
          // eslint-disable-next-line no-console
          console.error('[YOOTOO/map] error', e?.error ?? e);
          if (/style|glyph|sprite/i.test(msg)) {
            // eslint-disable-next-line no-console
            console.error('[YOOTOO/map] ÉCHEC DU STYLE CUSTOM yootoo-s1 — pas de repli sur light-v11.');
            if (!cancelled) setStatus('error');
          }
        });

        // LOG TEMPORAIRE de contrôle : confirme que la carte charge bien NOTRE style custom.
        // `water` doit valoir '#83CFDC' (valeur propre à yootoo-s1) — si c'est le style Mapbox
        // par défaut, la couleur serait différente et le nom ne serait pas « YOOTOO S1 ».
        map.on('style.load', () => {
          try {
            const st = map.getStyle();
            // eslint-disable-next-line no-console
            console.info('[YOOTOO/map] loaded style: yootoo-s1', {
              name: st?.name,
              id: (st as { id?: string } | undefined)?.id,
              water: map.getPaintProperty('water', 'fill-color'),
            });
          } catch {
            /* getStyle indisponible → ignorer */
          }
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
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[YOOTOO/map] error (viewport emit)', err);
          }
        };

        map.on('load', () => {
          if (cancelled) return;
          if (timeout) clearTimeout(timeout);
          // PROTOTYPE (réversible, web-only) — végétation NATIONALE : arbres 2.5D dérivés au
          // runtime des polygones de végétation réels des tuiles (France entière), jamais hors
          // zones vertes. Installé AVANT le contrôleur → marqueurs commerces au-dessus. Non bloquant.
          try {
            installVegetationScatter(map);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[YOOTOO/map] error (veg scatter proto)', err);
          }
          try {
            controllerRef.current = new MapClusterController(
              map,
              mapboxgl,
              (id) => onSelectRef.current?.(id),
              hasRestoredCamera,
            );
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[YOOTOO/map] error (controller init)', err);
          }

          // --- Spatial Engine : toute la caméra passe désormais par le Camera Engine ---
          try {
            const bridge = new MapboxCameraBridge(map);
            const scheduler = new CameraScheduler(bridge, realTimer, {
              reduceMotion: prefersReducedMotion(),
            });
            // Un écran émet une INTENTION ; la Strategy (pure) en fait un plan ; le Scheduler arbitre.
            const request = (intent: CameraIntent, context: CameraContext) => {
              const el = containerRef.current;
              const plan = resolveCameraPlan(intent, {
                context,
                current: bridge.getPose(),
                reduceMotion: prefersReducedMotion(),
                viewport: el ? { width: el.clientWidth, height: el.clientHeight } : undefined,
              });
              if (plan) scheduler.submit(plan);
            };
            cameraRef.current = { scheduler, request };

            // L'utilisateur gagne TOUJOURS : un geste réel interrompt toute caméra automatique.
            // `originalEvent` distingue le geste (présent) de nos propres animations (absent).
            const onGestureStart = (e: unknown) => {
              if ((e as { originalEvent?: unknown }).originalEvent) scheduler.notifyGestureStart();
            };
            map.on('dragstart', onGestureStart);
            map.on('zoomstart', onGestureStart);
            map.on('rotatestart', onGestureStart);
            map.on('pitchstart', onGestureStart);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[YOOTOO/map] error (camera init)', err);
          }

          // `originalEvent` présent ⇒ geste utilisateur ; absent ⇒ programmatique (notre caméra).
          map.on('moveend', (e: { originalEvent?: unknown }) => {
            const userInitiated = Boolean(e.originalEvent);
            // Fin de geste : la caméra reste où l'utilisateur l'a laissée (aucun snap-back).
            if (userInitiated) cameraRef.current?.scheduler.notifyGestureEnd();
            emitViewport(userInitiated);
          });
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
      cameraRef.current = null;
      controllerRef.current?.destroy();
      controllerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, mapStyle, centerLat, centerLng, zoom, pitch, bearing, hasRestoredCamera]);

  // --- Données (commerces + position) : mise à jour sans recharge ---
  useEffect(() => {
    if (!ready || !controllerRef.current) return;
    controllerRef.current.setData(markers, userLocation, userAccuracy);
  }, [ready, markers, userLocation, userAccuracy]);

  // --- Sélection : restyle du marqueur (sans reconstruire la carte) ---
  useEffect(() => {
    if (!ready || !controllerRef.current) return;
    controllerRef.current.setSelected(selectedId ?? null);
  }, [ready, selectedId]);

  // --- Caméra à la sélection (film 8 s : `focus`) / à la fermeture (film 30 s : `return`) ---
  useEffect(() => {
    if (!ready) return;
    const cam = cameraRef.current;
    const prev = prevSelectedRef.current;
    prevSelectedRef.current = selectedId ?? null;
    if (!cam) return;
    if (selectedId) {
      const m = markersRef.current.find((mk) => mk.id === selectedId);
      if (m) cam.request({ kind: 'focus', target: m.coordinate }, 'merchantSelected');
    } else if (prev) {
      // Désélection : on retrouve son contexte (léger recul), jamais ramené ailleurs de force.
      cam.request({ kind: 'overview' }, 'backToMap');
    }
  }, [ready, selectedId]);

  // --- 1er fix GPS : « voici où vous êtes » (film : `follow`), une seule fois ---
  const flownToUserRef = useRef(false);
  useEffect(() => {
    if (!ready || !userLocation || flownToUserRef.current) return;
    flownToUserRef.current = true;
    cameraRef.current?.request({ kind: 'focus', target: userLocation }, 'aroundMe');
  }, [ready, userLocation]);

  // --- Recentrage explicite (bouton « Me recentrer ») : à chaque incrément du jeton ---
  useEffect(() => {
    if (!ready || !recenterToken) return;
    const loc = userLocationRef.current;
    if (loc) cameraRef.current?.request({ kind: 'focus', target: loc }, 'recenter');
  }, [recenterToken, ready]);

  // --- Redimensionnement du conteneur (ex. split Focus desktop) : Mapbox doit recalculer sa taille ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
