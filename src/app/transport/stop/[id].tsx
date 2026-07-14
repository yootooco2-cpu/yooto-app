import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { RouteChip } from '@/features/transit/components/RouteChip';
import { groupStopsIntoStations, useTransitRoutes, useTransitStops } from '@/features/transit';
import { formatDeparture } from '@/features/transit/schedule';
import { useStationDepartures } from '@/features/transit/useStationDepartures';

/**
 * Fiche d'un arrêt : prochains départs par ligne et direction. Le libellé « Temps réel »
 * n'apparaît QUE si le flux GTFS-RT officiel est frais (< 300 s) ; sinon « Horaire
 * théorique » est affiché explicitement. Jamais d'horaire inventé : sans donnée, on le dit.
 */
export default function TransitStopScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stops = useTransitStops();
  const routes = useTransitRoutes();
  // La fiche est une STATION : ses horaires agrègent TOUS ses quais (le parent GTFS n'en a aucun).
  const station = useMemo(() => groupStopsIntoStations(stops.data ?? []).find((s) => String(s.id) === id), [stops.data, id]);
  const { groups, rtFresh, alerts, loading: schedLoading, error, now, refresh } = useStationDepartures(station);

  const routesById = useMemo(() => new Map((routes.data ?? []).map((r) => [r.routeId, r])), [routes.data]);
  const loading = schedLoading || stops.isLoading;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/transport/bus-tram'))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <YText style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{station?.name ?? 'Arrêt'}</YText>
        <Pressable onPress={refresh} hitSlop={10} accessibilityRole="button" accessibilityLabel="Actualiser">
          <Feather name="refresh-cw" size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {alerts.map((a, i) => (
          <View key={i} style={[styles.alert, { borderColor: colors.separator, backgroundColor: colors.surface }]}>
            <Feather name="alert-triangle" size={14} color={colors.accent} />
            <YText variant="caption" style={[styles.alertText, { color: colors.text }]}>{a}</YText>
          </View>
        ))}
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: rtFresh ? colors.primary : colors.surface, borderColor: colors.separator }]}>
            <YText variant="caption" style={{ color: rtFresh ? '#fff' : colors.mutedText }}>
              {rtFresh ? 'Temps réel' : 'Horaire théorique'}
            </YText>
          </View>
          {station?.wheelchairBoarding === 1 ? (
            <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
              <YText variant="caption" color="muted">Accessible PMR (donnée officielle)</YText>
            </View>
          ) : null}
        </View>

        {loading ? (
          <YText variant="caption" color="muted">Chargement des horaires…</YText>
        ) : error ? (
          <YText variant="caption" color="muted">Horaires indisponibles — réessayez avec Actualiser.</YText>
        ) : groups.length === 0 ? (
          <YText variant="caption" color="muted">Aucun départ prévu dans les 2 prochaines heures (données TaM du jour).</YText>
        ) : (
          groups.map((g) => {
            const route = routesById.get(g.routeId);
            return (
              <View key={`${g.routeId}|${g.headsign}`} style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
                <View style={styles.groupHead}>
                  {route ? <RouteChip route={route} /> : null}
                  <YText style={[styles.headsign, { color: colors.text }]} numberOfLines={1}>→ {g.headsign || route?.longName || ''}</YText>
                </View>
                <View style={styles.times}>
                  {g.next.map((d, i) => (
                    <View key={i} style={styles.time}>
                      <YText style={[styles.timeMain, { color: colors.text }]}>{formatDeparture(d.epochMs, now)}</YText>
                      <YText variant="caption" color="muted">{d.source === 'temps-reel' ? 'temps réel' : 'théorique'}</YText>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingTop: 58, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 17, fontWeight: '700', flexShrink: 1 },
  content: { padding: spacing.lg, gap: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  alert: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start', padding: spacing.sm, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth },
  alertText: { flex: 1 },
  group: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.sm },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headsign: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  times: { flexDirection: 'row', gap: spacing.lg },
  time: { alignItems: 'flex-start' },
  timeMain: { fontSize: 16, fontWeight: '700' },
});
