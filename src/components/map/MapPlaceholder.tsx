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
  /** Remplit la hauteur disponible (flex) au lieu de la hauteur fixe. */
  fill?: boolean;
};

/** Nombre maximum de pins rendus dans le placeholder (anti-surcharge). */
const MAX_PINS = 40;
/** Marge intérieure (%) pour ne pas coller les pins aux bords. */
const PAD = 10;

interface BBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function computeBBox(markers: MapMarker[]): BBox {
  const lats = markers.map((m) => m.coordinate.latitude);
  const lngs = markers.map((m) => m.coordinate.longitude);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/** Position (%) d'un marqueur : `placeholderPosition` (démo) sinon projection bbox. */
function projectMarker(marker: MapMarker, bbox: BBox): { x: number; y: number } {
  if (marker.placeholderPosition) return marker.placeholderPosition;
  const latSpan = bbox.maxLat - bbox.minLat || 1;
  const lngSpan = bbox.maxLng - bbox.minLng || 1;
  const span = 100 - 2 * PAD;
  const x = PAD + ((marker.coordinate.longitude - bbox.minLng) / lngSpan) * span;
  // latitude haute = haut de la carte → on inverse l'axe y
  const y = PAD + ((bbox.maxLat - marker.coordinate.latitude) / latSpan) * span;
  return { x, y };
}

/**
 * Implémentation de secours du Cartographic Engine — 100 % web-safe, sans
 * dépendance carto. Projette les marqueurs depuis leurs coordonnées (bbox) et
 * plafonne le nombre de pins pour rester lisible avec des centaines de commerces.
 */
export function MapPlaceholder({ markers, selectedId, onSelectMarker, userLocation, fill }: Props) {
  const visible = markers.slice(0, MAX_PINS);
  const hidden = markers.length - visible.length;
  const bbox = visible.length > 0 ? computeBBox(visible) : null;

  return (
    <View style={[styles.container, fill ? styles.fill : styles.fixedHeight]}>
      {/* Décor évoquant une carte (parcs, axes) sans librairie */}
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />
      <View style={[styles.road, styles.roadH]} />
      <View style={[styles.road, styles.roadV]} />

      {bbox
        ? visible.map((marker) => {
            const position = projectMarker(marker, bbox);
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
          })
        : null}

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

      {hidden > 0 ? (
        <View style={styles.countBadge}>
          <YText variant="caption" color="muted">
            +{hidden} autres commerces
          </YText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#EEF3EC',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fixedHeight: {
    height: 280,
  },
  fill: {
    flex: 1,
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
  countBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
