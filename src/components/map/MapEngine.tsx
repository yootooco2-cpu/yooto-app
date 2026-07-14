import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeModules, Pressable, StyleSheet, View } from 'react-native';

import { MapPlaceholder } from '@/components/map/MapPlaceholder';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';
import type { MapCoordinate, MapEngineProps, MapMarker } from '@/features/map';
import { getMapConfig } from '@/features/map/config';
import { publishLightPhase } from '@/features/map/lightPhaseStore';
import { presetForTime } from '@/features/map/solarLightCycle';

/**
 * Cartographic Engine — implémentation NATIVE (S4.2, `@rnmapbox/maps`, dev build requis).
 * Même doctrine que `MapEngine.web.tsx` : STYLE OFFICIEL GELÉ via getMapConfig (Mapbox
 * Standard — décision DA du 9/7/2026, S1 archivé), personnalisation UNIQUEMENT par config
 * du basemap (POI natifs masqués, lightPreset solaire réel) — jamais de retouche graphique.
 * Repli honnête : sans dev build ou sans token, `MapPlaceholder` (fallback universel).
 */

type MapboxSDK = typeof import('@rnmapbox/maps');
type CameraRef = import('@rnmapbox/maps').Camera;
type MapState = import('@rnmapbox/maps').MapState;

function loadMapboxSdk(): MapboxSDK | null {
  if (NativeModules?.RNMBXModule == null) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- module natif optionnel
    return require('@rnmapbox/maps') as MapboxSDK;
  } catch {
    return null;
  }
}

/** Plafond de pins RN simultanés (MarkerView) — la carte ne reçoit jamais tout un corpus. */
const MAX_NATIVE_MARKERS = 80;
const KM_PER_DEG_LAT = 111.32;

const kmBetween = (a: MapCoordinate, b: MapCoordinate): number => {
  const dLat = (a.latitude - b.latitude) * KM_PER_DEG_LAT;
  const dLng = (a.longitude - b.longitude) * KM_PER_DEG_LAT * Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

/** Rayon visible approximatif (km) avec marge ×1.5 — même heuristique que le fenêtrage transit. */
function radiusForZoom(zoom: number, latitude: number): number {
  const world = 40075 * Math.cos((latitude * Math.PI) / 180);
  return Math.max(0.3, ((world * 390) / (512 * 2 ** zoom)) * 1.5);
}

/** Marqueurs du secteur visible, plafonnés aux plus proches du centre. */
function visibleMarkers(markers: MapMarker[], center: MapCoordinate, zoom: number): MapMarker[] {
  const radius = radiusForZoom(zoom, center.latitude);
  return markers
    .map((m) => ({ m, d: kmBetween(center, m.coordinate) }))
    .filter((x) => x.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, MAX_NATIVE_MARKERS)
    .map((x) => x.m);
}

/** Pin YOOTOO (pastille + pointe) — mêmes tokens que `MapMarkerPin`, ancré sur le point. */
function EnginePin({ marker, active, onPress }: { marker: MapMarker; active: boolean; onPress: () => void }) {
  const label = marker.label ?? marker.title ?? '•';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Commerce ${label}`}
      hitSlop={6}
      onPress={onPress}
      style={styles.pinWrap}>
      <View style={[styles.pinDot, shadows.sm, active && styles.pinDotActive]}>
        <YText variant="caption" color={active ? 'inverse' : 'default'} numberOfLines={1}>
          {label}
        </YText>
      </View>
      <View style={[styles.pinTip, active && styles.pinTipActive]} />
    </Pressable>
  );
}

export function MapEngine(props: MapEngineProps) {
  const { markers, selectedId, onSelectMarker, onViewportChange, userLocation, recenterToken, initialCamera, fill } = props;
  const sdk = useMemo(() => loadMapboxSdk(), []);
  const { token, mapStyle, defaultRegion } = useMemo(() => getMapConfig(), []);
  const [tokenReady, setTokenReady] = useState(false);
  const cameraRef = useRef<CameraRef | null>(null);
  const cbRef = useRef({ onSelectMarker, onViewportChange });
  useEffect(() => { cbRef.current = { onSelectMarker, onViewportChange }; });

  // Caméra initiale : viewport restauré (session) s'il existe, sinon région par défaut —
  // pitch/bearing retombent TOUJOURS sur l'ouverture oblique officielle (R3), comme le web.
  const restored = useRef(initialCamera).current;
  const cam = restored ?? defaultRegion;
  const pitch = cam.pitch ?? defaultRegion.pitch ?? 0;
  const bearing = cam.bearing ?? defaultRegion.bearing ?? 0;

  const [region, setRegion] = useState<{ center: MapCoordinate; zoom: number }>(
    () => ({ center: cam.center, zoom: cam.zoom }),
  );

  // Ambiance lumineuse : cycle solaire RÉEL (parité web) — publiée pour le reste de l'app.
  const lightPreset = useMemo(
    () => presetForTime(Date.now(), cam.center.latitude, cam.center.longitude),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- figée à l'ouverture, comme le web
    [],
  );
  useEffect(() => { publishLightPhase(lightPreset); }, [lightPreset]);

  useEffect(() => {
    if (!sdk || !token) return;
    let alive = true;
    void sdk.default.setAccessToken(token).then(() => { if (alive) setTokenReady(true); });
    return () => { alive = false; };
  }, [sdk, token]);

  // Sélection → centrage doux ; recentrage → vol vers l'utilisateur.
  useEffect(() => {
    if (selectedId == null) return;
    const m = markers.find((mk) => mk.id === selectedId);
    if (m) cameraRef.current?.setCamera({ centerCoordinate: [m.coordinate.longitude, m.coordinate.latitude], animationMode: 'easeTo', animationDuration: 450 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- vole uniquement au changement de sélection
  }, [selectedId]);
  useEffect(() => {
    if (!recenterToken || !userLocation) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [userLocation.longitude, userLocation.latitude],
      zoomLevel: Math.max(region.zoom, 14),
      animationMode: 'easeTo',
      animationDuration: 600,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- le jeton seul déclenche le vol
  }, [recenterToken]);

  // `userInitiated` : un geste a-t-il été vu depuis le dernier idle ? (parité contrat web)
  const gestureSeen = useRef(false);
  const handleCameraChanged = useCallback((s: MapState) => {
    if (s.gestures.isGestureActive) gestureSeen.current = true;
  }, []);
  const handleMapIdle = useCallback((s: MapState) => {
    const [lng, lat] = s.properties.center;
    const { ne, sw } = s.properties.bounds;
    setRegion({ center: { latitude: lat, longitude: lng }, zoom: s.properties.zoom });
    cbRef.current.onViewportChange?.(
      {
        center: { latitude: lat, longitude: lng },
        zoom: s.properties.zoom,
        bounds: { west: sw[0], south: sw[1], east: ne[0], north: ne[1] },
      },
      gestureSeen.current,
    );
    gestureSeen.current = false;
  }, []);

  const shown = useMemo(
    () => visibleMarkers(markers, region.center, region.zoom),
    [markers, region],
  );

  // Repli honnête (Expo Go, web sans ce fichier, token absent) : le placeholder historique.
  if (!sdk || !token) return <MapPlaceholder {...props} />;
  if (!tokenReady) return <View style={fill ? styles.fill : styles.fixedHeight} />;

  const { MapView, Camera, MarkerView, StyleImport } = sdk;
  return (
    <MapView
      testID="mapbox-map-view"
      style={fill ? styles.fill : styles.fixedHeight}
      styleURL={typeof mapStyle === 'string' ? mapStyle : JSON.stringify(mapStyle)}
      scaleBarEnabled={false}
      onCameraChanged={handleCameraChanged}
      onMapIdle={handleMapIdle}
      accessibilityLabel="Carte des commerces YOOTOO">
      {/* Personnalisation LÉGÈRE du basemap officiel : POI natifs masqués (les commerces
          YOOTOO restent les seuls héros), ambiance solaire — jamais de style custom. */}
      <StyleImport
        id="basemap"
        existing
        config={{ showPointOfInterestLabels: false, lightPreset }}
      />
      <Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: [cam.center.longitude, cam.center.latitude],
          zoomLevel: cam.zoom,
          pitch,
          heading: bearing,
        }}
      />
      {userLocation ? (
        <MarkerView coordinate={[userLocation.longitude, userLocation.latitude]} allowOverlap>
          <View accessibilityLabel="Votre position" style={styles.userRing}>
            <View style={styles.userDot} />
          </View>
        </MarkerView>
      ) : null}
      {shown.map((m) => (
        <MarkerView
          key={m.id}
          coordinate={[m.coordinate.longitude, m.coordinate.latitude]}
          anchor={{ x: 0.5, y: 1 }}
          allowOverlap>
          <EnginePin marker={m} active={m.id === selectedId} onPress={() => cbRef.current.onSelectMarker?.(m.id)} />
        </MarkerView>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fixedHeight: { height: 280 },
  pinWrap: { alignItems: 'center', maxWidth: 140 },
  pinDot: {
    minWidth: 32, height: 32, paddingHorizontal: 8, borderRadius: 16,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  pinDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pinTip: {
    width: 8, height: 8, marginTop: -4, backgroundColor: colors.surface,
    borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  pinTipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  userRing: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(37,99,235,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  userDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#FFFFFF' },
});
