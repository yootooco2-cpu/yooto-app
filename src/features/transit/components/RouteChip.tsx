import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';

import type { TransitRoute } from '../types';

/** « Tramway » / « Bus » selon la spécification GTFS route_type (0 tram, 3 bus). */
export function routeKind(route: TransitRoute): string {
  return route.routeType === 0 ? 'Tramway' : route.routeType === 3 ? 'Bus' : 'Ligne';
}

/** Contraste lisible sur la couleur officielle du réseau. */
function textOn(hex: string): string {
  const n = parseInt(hex, 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? '#1A1A1A' : '#FFFFFF';
}

/** Pastille de ligne aux couleurs OFFICIELLES du réseau (GTFS route_color). */
export function RouteChip({ route }: { route: TransitRoute }) {
  const bg = route.color ? `#${route.color}` : '#5B6770';
  return (
    <View style={[styles.chip, { backgroundColor: bg }]} accessibilityLabel={`Ligne ${route.shortName ?? route.routeId}`}>
      <YText style={[styles.label, { color: route.color ? textOn(route.color) : '#FFFFFF' }]}>
        {route.shortName ?? route.routeId}
      </YText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { minWidth: 26, paddingHorizontal: 6, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '700' },
});
