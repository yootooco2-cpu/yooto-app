import { Feather } from '@expo/vector-icons';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { haptics } from '@/lib/haptics';

import type { StationWithRoutes, TransitMode } from '../mapModel';
import { formatDeparture } from '../schedule';
import { nextSheetState, sheetHeightPx, type SheetState } from '../sheetModel';
import type { useStationDepartures } from '../useStationDepartures';
import { RouteChip } from './RouteChip';

/**
 * Bottom sheet Bus & Tram — trois états SANS geste complexe (boutons chevrons + poignée
 * cliquable, cibles ≥ 44 px) :
 *  réduit        → station sélectionnée : distance, lignes, 2 prochains départs ;
 *  intermédiaire → arrêts proches triés par distance, prochains départs visibles ;
 *  développé     → directions/terminus, horaires complets, Temps réel/théorique, PMR,
 *                  perturbations officielles. Pull-to-refresh sur la liste.
 */

export type { SheetState } from '../sheetModel';

interface Props {
  /** Le mode courant dessert-il la station sélectionnée ? (message explicite sinon). */
  servesMode: boolean;
  mode: TransitMode;
  state: SheetState;
  onState: (s: SheetState) => void;
  screenHeight: number;
  stations: (StationWithRoutes & { distanceKm?: number })[];
  selected: (StationWithRoutes & { distanceKm?: number }) | null;
  onSelect: (id: number) => void;
  onCloseSelection: () => void;
  schedule: ReturnType<typeof useStationDepartures>;
  refreshing: boolean;
  onRefreshAll: () => void;
  noGeo: boolean;
}

const fmtDist = (km?: number) => km === undefined ? null : km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

export function StopSheet(p: Props) {
  const { colors } = useTheme();
  // Hauteur cible calculée côté JS : le worklet ne capture qu'un NOMBRE (jamais une
  // fonction JS — crash Reanimated « non-worklet on the UI thread » sur natif).
  const targetHeight = sheetHeightPx(p.state, p.screenHeight);
  const style = useAnimatedStyle(() => ({ height: withTiming(targetHeight, { duration: 240 }) }), [targetHeight]);
  const move = (dir: 1 | -1) => {
    const next = nextSheetState(p.state, dir, p.selected !== null);
    if (next !== p.state) { haptics.light(); p.onState(next); }
  };

  return (
    <Animated.View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.separator }, style]}>
      {/* Poignée + commandes accessibles (aucun glissement requis). */}
      <View style={styles.headRow}>
        <Pressable onPress={() => move(-1)} disabled={p.state === 'reduced'} hitSlop={8} accessibilityRole="button" accessibilityLabel="Réduire le panneau" style={styles.headBtn}>
          <Feather name="chevron-down" size={20} color={p.state === 'reduced' ? colors.separator : colors.text} />
        </Pressable>
        <Pressable onPress={() => move(p.state === 'full' ? -1 : 1)} accessibilityRole="button" accessibilityLabel="Basculer la taille du panneau" style={styles.handleHit}>
          <View style={[styles.handle, { backgroundColor: colors.separator }]} />
        </Pressable>
        <Pressable onPress={() => move(1)} disabled={p.state === 'full'} hitSlop={8} accessibilityRole="button" accessibilityLabel="Agrandir le panneau" style={styles.headBtn}>
          <Feather name="chevron-up" size={20} color={p.state === 'full' ? colors.separator : colors.text} />
        </Pressable>
      </View>

      {p.noGeo ? (
        <YText variant="caption" color="muted" style={styles.noGeo}>
          Position inconnue — carte centrée sur Montpellier, arrêts sans distance.
        </YText>
      ) : null}

      {p.selected && p.state === 'reduced' ? <Summary p={p} />
        : p.selected && p.state === 'full' ? <FullDetail p={p} />
          : <NearbyList p={p} />}
    </Animated.View>
  );
}

/** État RÉDUIT : l'essentiel de la station sélectionnée. */
function Summary({ p }: { p: Props }) {
  const { colors } = useTheme();
  const s = p.selected!;
  const modeRouteIds = new Set(s.routes.map((r) => r.routeId));
  const nextTwo = (p.servesMode ? p.schedule.departures.filter((d) => modeRouteIds.has(d.routeId)) : []).slice(0, 2);
  if (!p.servesMode) {
    return (
      <View style={styles.summary}>
        <View style={styles.summaryHead}>
          <YText style={[styles.title, { color: colors.text }]} numberOfLines={1}>{s.name}</YText>
          <Pressable onPress={p.onCloseSelection} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer la sélection" style={styles.closeBtn}>
            <Feather name="x" size={16} color={colors.mutedText} />
          </Pressable>
        </View>
        <YText variant="caption" color="muted">
          Cet arrêt ne dessert pas de {p.mode === 'bus' ? 'bus' : 'tramway'} — repassez sur « Tous » pour voir ses horaires.
        </YText>
      </View>
    );
  }
  return (
    <View style={styles.summary}>
      <View style={styles.summaryHead}>
        <YText style={[styles.title, { color: colors.text }]} numberOfLines={1}>{s.name}</YText>
        {fmtDist(s.distanceKm) ? <YText variant="caption" color="muted">{fmtDist(s.distanceKm)}</YText> : null}
        <Pressable onPress={p.onCloseSelection} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer la sélection" style={styles.closeBtn}>
          <Feather name="x" size={16} color={colors.mutedText} />
        </Pressable>
      </View>
      <View style={styles.chips}>{s.routes.slice(0, 8).map((r) => <RouteChip key={r.id} route={r} />)}</View>
      <View style={styles.nextRow}>
        {p.schedule.loading ? <YText variant="caption" color="muted">Chargement des départs…</YText>
          : nextTwo.length === 0 ? <YText variant="caption" color="muted">Aucun départ dans les 2 h (données du jour).</YText>
            : nextTwo.map((d, i) => (
              <YText key={i} variant="caption" style={{ color: colors.text }}>
                <YText style={[styles.nextTime, { color: colors.text }]}>{formatDeparture(d.epochMs, p.schedule.now)}</YText>
                {'  '}→ {d.headsign || '—'}{d.source === 'temps-reel' ? '  · temps réel' : ''}
              </YText>
            ))}
      </View>
    </View>
  );
}

/** État INTERMÉDIAIRE : arrêts proches, départs visibles, pull-to-refresh. */
function NearbyList({ p }: { p: Props }) {
  const { colors } = useTheme();
  return (
    <FlatList
      style={styles.fill}
      data={p.stations.slice(0, 40)}
      keyExtractor={(s) => String(s.id)}
      refreshControl={<RefreshControl refreshing={p.refreshing} onRefresh={p.onRefreshAll} />}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const selected = p.selected?.id === item.id;
        return (
          <Pressable
            onPress={() => p.onSelect(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Arrêt ${item.name}`}
            style={[styles.row, { borderColor: selected ? colors.primary : colors.separator, backgroundColor: colors.background }]}>
            <View style={styles.rowHead}>
              <YText style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{item.name}</YText>
              {fmtDist(item.distanceKm) ? <YText variant="caption" color="muted">{fmtDist(item.distanceKm)}</YText> : null}
            </View>
            <View style={styles.rowMeta}>
              <YText variant="caption" color="muted">
                {item.routes.some((r) => r.routeType === 0) && item.routes.some((r) => r.routeType === 3) ? 'Tramway · Bus'
                  : item.routes.some((r) => r.routeType === 0) ? 'Tramway' : 'Bus'}
              </YText>
              {item.wheelchairBoarding === 1 ? <Feather name="user-check" size={12} color={colors.primary} accessibilityLabel="Accessible PMR" /> : null}
            </View>
            <View style={styles.chips}>{item.routes.slice(0, 7).map((r) => <RouteChip key={r.id} route={r} />)}</View>
          </Pressable>
        );
      }}
    />
  );
}

/** État DÉVELOPPÉ : fiche complète de la station sélectionnée. */
function FullDetail({ p }: { p: Props }) {
  const { colors } = useTheme();
  const s = p.selected!;
  const { rtFresh, alerts, loading, error, now, refresh } = p.schedule;
  const modeRouteIds = new Set(s.routes.map((r) => r.routeId));
  const groups = p.servesMode ? p.schedule.groups.filter((g) => modeRouteIds.has(g.routeId)) : [];
  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.fullContent} refreshControl={<RefreshControl refreshing={p.refreshing} onRefresh={() => { refresh(); p.onRefreshAll(); }} />}>
      <View style={styles.summaryHead}>
        <YText style={[styles.title, { color: colors.text }]} numberOfLines={1}>{s.name}</YText>
        {fmtDist(s.distanceKm) ? <YText variant="caption" color="muted">{fmtDist(s.distanceKm)}</YText> : null}
      </View>
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: rtFresh ? colors.primary : colors.background, borderColor: colors.separator }]}>
          <YText variant="caption" style={{ color: rtFresh ? '#fff' : colors.mutedText }}>{rtFresh ? 'Temps réel' : 'Horaire théorique'}</YText>
        </View>
        {s.wheelchairBoarding === 1 ? (
          <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.separator }]}>
            <YText variant="caption" color="muted">Accessible PMR (donnée officielle)</YText>
          </View>
        ) : null}
      </View>
      {alerts.map((a, i) => (
        <View key={i} style={[styles.alert, { borderColor: colors.separator, backgroundColor: colors.background }]}>
          <Feather name="alert-triangle" size={14} color={colors.accent} />
          <YText variant="caption" style={[styles.alertText, { color: colors.text }]}>{a}</YText>
        </View>
      ))}
      {loading ? <YText variant="caption" color="muted">Chargement des horaires…</YText>
        : error ? <YText variant="caption" color="muted">Horaires indisponibles — tirez pour réessayer.</YText>
          : !p.servesMode ? <YText variant="caption" color="muted">Cet arrêt ne dessert pas de {p.mode === 'bus' ? 'bus' : 'tramway'} — repassez sur « Tous ».</YText>
            : groups.length === 0 ? <YText variant="caption" color="muted">Aucun départ prévu dans les 2 prochaines heures (données TaM du jour).</YText>
            : groups.map((g) => {
              const route = s.routes.find((r) => r.routeId === g.routeId);
              return (
                <View key={`${g.routeId}|${g.headsign}`} style={[styles.group, { backgroundColor: colors.background, borderColor: colors.separator }]}>
                  <View style={styles.groupHead}>
                    {route ? <RouteChip route={route} /> : null}
                    <YText style={[styles.headsign, { color: colors.text }]} numberOfLines={1}>→ {g.headsign || route?.longName || ''}</YText>
                  </View>
                  <View style={styles.times}>
                    {g.next.map((d, i) => (
                      <View key={i}>
                        <YText style={[styles.timeMain, { color: colors.text }]}>{formatDeparture(d.epochMs, now)}</YText>
                        <YText variant="caption" color="muted">{d.source === 'temps-reel' ? 'temps réel' : 'théorique'}</YText>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  // flex:1 OBLIGATOIRE : dans le sheet à hauteur animée (overflow hidden), une liste sans
  // flex prend la hauteur de son CONTENU → contentSize == frame → aucun scroll (bug natif).
  fill: { flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  headBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  handleHit: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 44, height: 5, borderRadius: 3 },
  noGeo: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  summary: { paddingHorizontal: spacing.lg, gap: 6 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', flexShrink: 1, flexGrow: 1 },
  closeBtn: { minWidth: 44, minHeight: 32, alignItems: 'flex-end', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center' },
  nextRow: { gap: 2 },
  nextTime: { fontWeight: '700' },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
  row: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: 5, minHeight: 44 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rowName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fullContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  alert: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start', padding: spacing.sm, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  alertText: { flex: 1 },
  group: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.sm },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headsign: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  times: { flexDirection: 'row', gap: spacing.lg },
  timeMain: { fontSize: 16, fontWeight: '700' },
});
