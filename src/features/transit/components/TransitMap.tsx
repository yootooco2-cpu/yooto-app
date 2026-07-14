import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NativeModules, Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { getMapConfig } from '@/features/map/config';

import { stationKind, type StationCluster, type StationWithRoutes } from '../mapModel';
import type { TransitMapProps } from './TransitMap.web';

export type { TransitMapFocus, TransitMapProps } from './TransitMap.web';

/**
 * Carte Bus & Tram — NATIF (`@rnmapbox/maps`, dev build requis, STYLE YOOTOO GELÉ via
 * getMapConfig, jamais surchargé). Miroir exact de `TransitMap.web.tsx` : différenciation
 * Bus/Tramway par FORME + LETTRE (jamais la couleur seule), couleurs officielles des lignes
 * en pastilles, sélection agrandie, cibles tactiles 44 px, grappes comptées aux zooms larges.
 * Aucun commerce ici — uniquement les stations fournies par le modèle (déjà fenêtrées).
 */

type MapboxSDK = typeof import('@rnmapbox/maps');
type CameraRef = import('@rnmapbox/maps').Camera;
type MapState = import('@rnmapbox/maps').MapState;

/**
 * SDK natif présent uniquement dans un dev build (jamais dans Expo Go) : chargement guardé
 * par la présence du module natif, pour que le bundle reste lançable partout.
 */
function loadMapboxSdk(): MapboxSDK | null {
  if (NativeModules?.RNMBXModule == null) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- module natif optionnel
    return require('@rnmapbox/maps') as MapboxSDK;
  } catch {
    return null;
  }
}

const KIND_GLYPH: Record<string, string> = { tram: 'T', bus: 'B', mixte: 'T·B', inconnu: '•' };

function StationMarker({ station, selected, onPress }: {
  station: StationWithRoutes;
  selected: boolean;
  onPress: () => void;
}) {
  const kind = stationKind(station.routes);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Station ${station.name}`}
      onPress={onPress}
      style={styles.hit}
    >
      <View style={[styles.markerBody, selected && styles.markerSelected]}>
        <View style={[styles.badge, kind === 'tram' ? styles.badgeTram : styles.badgeRound, selected && styles.badgeSelected]}>
          <YText style={[styles.badgeText, selected && styles.badgeTextSelected]}>{KIND_GLYPH[kind]}</YText>
        </View>
        <View style={styles.chipsRow}>
          {station.routes.slice(0, 3).map((r) => (
            <View key={r.id} style={[styles.chip, { backgroundColor: `#${r.color ?? '5B6770'}` }]}>
              <YText style={styles.chipText}>{r.shortName ?? ''}</YText>
            </View>
          ))}
          {station.routes.length > 3 ? <YText style={styles.moreText}>+{station.routes.length - 3}</YText> : null}
        </View>
      </View>
    </Pressable>
  );
}

function ClusterMarker({ cluster, onPress }: { cluster: StationCluster; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${cluster.count} stations, toucher pour zoomer`}
      onPress={onPress}
      style={styles.hit}
    >
      <View style={styles.clusterBubble}>
        <YText style={styles.clusterText}>{cluster.count}</YText>
      </View>
    </Pressable>
  );
}

export function TransitMap({ items, selectedId, onSelectStation, onSelectCluster, onRegionChange, userLocation, focus }: TransitMapProps) {
  const sdk = useMemo(() => loadMapboxSdk(), []);
  const { token, mapStyle, defaultRegion } = useMemo(() => getMapConfig(), []);
  const [tokenReady, setTokenReady] = useState(false);
  const cameraRef = useRef<CameraRef | null>(null);
  const cbRef = useRef({ onSelectStation, onSelectCluster, onRegionChange });
  useEffect(() => { cbRef.current = { onSelectStation, onSelectCluster, onRegionChange }; });

  // Le token est posé UNE fois avant de monter la carte (config gelée, jamais surchargée).
  useEffect(() => {
    if (!sdk || !token) return;
    let alive = true;
    void sdk.default.setAccessToken(token).then(() => { if (alive) setTokenReady(true); });
    return () => { alive = false; };
  }, [sdk, token]);

  // Recentrage piloté (sélection, bouton position, retour) — easeTo doux, comme le web.
  useEffect(() => {
    if (!focus) return;
    cameraRef.current?.setCamera({
      centerCoordinate: [focus.longitude, focus.latitude],
      ...(focus.zoom != null ? { zoomLevel: focus.zoom } : null),
      animationMode: 'easeTo',
      animationDuration: 450,
    });
  }, [focus]);

  // Équivalent natif du `moveend` web : fin de geste ou d'animation → fenêtrage recalculé en amont.
  const handleMapIdle = useCallback((state: MapState) => {
    const [longitude, latitude] = state.properties.center;
    cbRef.current.onRegionChange({ latitude, longitude }, state.properties.zoom);
  }, []);

  if (!sdk || !token) {
    return (
      <View style={styles.fallback}>
        <YText variant="caption" color="muted" style={styles.fallbackText}>
          {!token
            ? 'Carte indisponible (token Mapbox absent) — la liste ci-dessous reste utilisable.'
            : 'Carte native indisponible (dev build Mapbox requis) — la liste ci-dessous reste utilisable.'}
        </YText>
      </View>
    );
  }
  if (!tokenReady) return <View style={styles.fallback} />;

  const { MapView, Camera, MarkerView } = sdk;
  return (
    <MapView
      style={styles.map}
      styleURL={typeof mapStyle === 'string' ? mapStyle : JSON.stringify(mapStyle)}
      scaleBarEnabled={false}
      onMapIdle={handleMapIdle}
      accessibilityLabel="Carte des arrêts Bus et Tramway"
    >
      <Camera
        ref={cameraRef}
        defaultSettings={{
          centerCoordinate: [
            focus?.longitude ?? defaultRegion.center.longitude,
            focus?.latitude ?? defaultRegion.center.latitude,
          ],
          zoomLevel: focus?.zoom ?? 15.2,
          pitch: 40,
        }}
      />
      {userLocation ? (
        <MarkerView coordinate={[userLocation.longitude, userLocation.latitude]} allowOverlap>
          <View accessibilityLabel="Votre position" style={styles.userRing}>
            <View style={styles.userDot} />
          </View>
        </MarkerView>
      ) : null}
      {items.map((item) =>
        item.type === 'station' ? (
          <MarkerView key={`s-${item.station.id}`} coordinate={[item.station.longitude, item.station.latitude]} allowOverlap>
            <StationMarker
              station={item.station}
              selected={item.station.id === selectedId}
              onPress={() => cbRef.current.onSelectStation(item.station.id)}
            />
          </MarkerView>
        ) : (
          <MarkerView key={`c-${item.cluster.ids.join('-')}`} coordinate={[item.cluster.longitude, item.cluster.latitude]} allowOverlap>
            <ClusterMarker cluster={item.cluster} onPress={() => cbRef.current.onSelectCluster(item.cluster)} />
          </MarkerView>
        ),
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  fallbackText: { textAlign: 'center' },
  map: { flex: 1 },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  markerBody: { alignItems: 'center', gap: 1 },
  markerSelected: {
    transform: [{ scale: 1.28 }],
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  badge: {
    minWidth: 22, height: 22, paddingHorizontal: 3, borderWidth: 2, borderColor: '#1F2937',
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  badgeTram: { borderRadius: 7 }, // FORME : carré arrondi = tram, rond = bus
  badgeRound: { borderRadius: 11 },
  badgeSelected: { backgroundColor: '#1F2937' },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700', color: '#1F2937' },
  badgeTextSelected: { color: '#FFFFFF' },
  chipsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 5, paddingHorizontal: 2, paddingVertical: 1,
  },
  chip: { minWidth: 12, borderRadius: 4, paddingHorizontal: 3, alignItems: 'center' },
  chipText: { fontSize: 9, lineHeight: 12, fontWeight: '700', color: '#FFFFFF' },
  moreText: { fontSize: 9, lineHeight: 12, color: '#1F2937' },
  clusterBubble: {
    minWidth: 30, height: 30, paddingHorizontal: 4, borderRadius: 15, backgroundColor: '#1F2937',
    borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 5,
  },
  clusterText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  userRing: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(37,99,235,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  userDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2563EB', borderWidth: 3, borderColor: '#FFFFFF' },
});
