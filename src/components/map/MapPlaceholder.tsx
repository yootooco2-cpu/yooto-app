import { StyleSheet, View } from 'react-native';

import { MapMarkerPin } from '@/components/map/MapMarkerPin';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import type { MapCoordinate, MapMarker } from '@/features/map';

type Props = {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelectMarker?: (id: string) => void;
  userLocation?: MapCoordinate | null;
};

/**
 * Implémentation de secours du Cartographic Engine — 100 % web-safe, sans
 * dépendance carto. Utilisée tant qu'aucun provider (Mapbox GL JS / rnmapbox)
 * n'est branché, ou en l'absence de token. Rend des `MapMarker` génériques via
 * leur `placeholderPosition`.
 */
export function MapPlaceholder({ markers, selectedId, onSelectMarker, userLocation }: Props) {
  return (
    <View style={styles.container}>
      {/* Décor évoquant une carte (parcs, axes) sans librairie */}
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <View style={[styles.road, styles.roadH]} />
      <View style={[styles.road, styles.roadV]} />

      {markers.map((marker) => {
        const position = marker.placeholderPosition;
        if (!position) return null;
        return (
          <MapMarkerPin
            key={marker.id}
            x={position.x}
            y={position.y}
            label={marker.label ?? ''}
            active={marker.id === selectedId}
            onPress={() => onSelectMarker?.(marker.id)}
          />
        );
      })}

      {userLocation ? (
        <View style={styles.userDot}>
          <View style={styles.userDotCore} />
        </View>
      ) : null}

      {markers.length === 0 ? (
        <View style={styles.center}>
          <YText variant="body" color="muted">
            Aucun lieu sur cette zone
          </YText>
        </View>
      ) : null}

      <View style={styles.badge}>
        <YText variant="caption" color="muted">
          Carte interactive · Mapbox bientôt
        </YText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#EEF3EC',
    borderWidth: 1,
    borderColor: colors.border,
  },
  blob: {
    position: 'absolute',
    backgroundColor: '#DCE8DB',
    borderRadius: radii.pill,
  },
  blobA: {
    width: 160,
    height: 160,
    top: -40,
    left: -30,
  },
  blobB: {
    width: 200,
    height: 200,
    bottom: -70,
    right: -50,
    backgroundColor: '#E8E0CF',
  },
  road: {
    position: 'absolute',
    backgroundColor: '#F7F4EC',
  },
  roadH: {
    height: 14,
    left: 0,
    right: 0,
    top: '46%',
  },
  roadV: {
    width: 14,
    top: 0,
    bottom: 0,
    left: '52%',
  },
  userDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: -9,
    marginLeft: -9,
    backgroundColor: 'rgba(31,122,77,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  userDotCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
