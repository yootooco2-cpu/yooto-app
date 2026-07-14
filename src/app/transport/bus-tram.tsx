import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { useMerchantSearchStore } from '@/features/merchants';
import { RouteChip, routeKind } from '@/features/transit/components/RouteChip';
import { useTransitRoutes, useTransitStops, useTransitStopServices } from '@/features/transit';
import type { TransitRoute, TransitStop } from '@/features/transit';
import { haversineKm } from '@/lib/geo/haversine';

/**
 * Mobilité → Bus & Tram : arrêts proches (position ponctuelle, jamais de tracking),
 * recherche d'arrêt ou de ligne, lignes desservies (couleurs officielles), accessibilité
 * PMR officielle. Données : tables transit_* (source GTFS TaM) — jamais merchants.
 */
export default function BusTramScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const userLocation = useMerchantSearchStore((s) => s.userLocation);
  const stops = useTransitStops();
  const routes = useTransitRoutes();
  const services = useTransitStopServices();
  const [search, setSearch] = useState('');

  const routesByPk = useMemo(() => new Map((routes.data ?? []).map((r) => [r.id, r])), [routes.data]);
  const routesByStop = useMemo(() => {
    const m = new Map<number, TransitRoute[]>();
    for (const s of services.data ?? []) {
      const route = routesByPk.get(s.routePk);
      if (!route) continue;
      const list = m.get(s.stopPk) ?? [];
      if (!list.some((r) => r.id === route.id)) list.push(route);
      m.set(s.stopPk, list);
    }
    for (const list of m.values()) list.sort((a, b) => (a.shortName ?? '').localeCompare(b.shortName ?? '', 'fr', { numeric: true }));
    return m;
  }, [services.data, routesByPk]);

  const list = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = norm(search.trim());
    let items = (stops.data ?? []).map((stop) => ({
      stop: userLocation
        ? { ...stop, distanceKm: haversineKm(userLocation, { latitude: stop.latitude, longitude: stop.longitude }) }
        : stop,
      routes: routesByStop.get(stop.id) ?? [],
    }));
    if (q) {
      items = items.filter(({ stop, routes: rs }) =>
        norm(stop.name).includes(q) || rs.some((r) => norm(r.shortName ?? '').startsWith(q)));
    }
    // Tri par distance quand la position est connue, sinon alphabétique assumé (libellé neutre).
    items.sort((a, b) => (a.stop.distanceKm ?? Infinity) - (b.stop.distanceKm ?? Infinity)
      || a.stop.name.localeCompare(b.stop.name, 'fr'));
    return items.slice(0, 60);
  }, [stops.data, routesByStop, userLocation, search]);

  const loading = stops.isLoading || routes.isLoading || services.isLoading;
  const refresh = () => { void stops.refetch(); void routes.refetch(); void services.refetch(); };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour">
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <YText style={[styles.headerTitle, { color: colors.text }]}>Bus & Tram</YText>
        <Pressable onPress={refresh} hitSlop={10} accessibilityRole="button" accessibilityLabel="Actualiser">
          <Feather name="refresh-cw" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
        <Feather name="search" size={16} color={colors.mutedText} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Arrêt ou ligne (ex. Comédie, T1)…"
          placeholderTextColor={colors.mutedText}
          style={[styles.searchInput, { color: colors.text }]}
          accessibilityLabel="Rechercher un arrêt ou une ligne"
        />
      </View>

      {!userLocation ? (
        <YText variant="caption" color="muted" style={styles.hint}>
          Position inconnue — arrêts par ordre alphabétique. Activez la localisation pour voir les plus proches.
        </YText>
      ) : null}

      {loading ? (
        <YText variant="caption" color="muted" style={styles.hint}>Chargement des arrêts TaM…</YText>
      ) : stops.isError ? (
        <YText variant="caption" color="muted" style={styles.hint}>Réseau indisponible — réessayez avec Actualiser.</YText>
      ) : (
        <FlatList
          data={list}
          keyExtractor={({ stop }) => String(stop.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <StopRow stop={item.stop} routes={item.routes} onPress={() => router.push({ pathname: '/transport/stop/[id]', params: { id: String(item.stop.id) } })} />}
        />
      )}
    </View>
  );
}

function StopRow({ stop, routes, onPress }: { stop: TransitStop; routes: TransitRoute[]; onPress: () => void }) {
  const { colors } = useTheme();
  const kinds = new Set(routes.map(routeKind));
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Arrêt ${stop.name}`}
      style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderColor: colors.separator, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.rowHead}>
        <YText style={[styles.stopName, { color: colors.text }]} numberOfLines={1}>{stop.name}</YText>
        {stop.distanceKm !== undefined ? (
          <YText variant="caption" color="muted">
            {stop.distanceKm < 1 ? `${Math.round(stop.distanceKm * 1000)} m` : `${stop.distanceKm.toFixed(1)} km`}
          </YText>
        ) : null}
      </View>
      <View style={styles.rowMeta}>
        <YText variant="caption" color="muted">{[...kinds].join(' · ') || '—'}</YText>
        {stop.wheelchairBoarding === 1 ? <Feather name="user-check" size={13} color={colors.primary} accessibilityLabel="Accessible PMR" /> : null}
        {stop.wheelchairBoarding === 2 ? <YText variant="caption" color="muted">non accessible PMR</YText> : null}
      </View>
      <View style={styles.chips}>
        {routes.slice(0, 8).map((r) => <RouteChip key={r.id} route={r} />)}
        {routes.length > 8 ? <YText variant="caption" color="muted">+{routes.length - 8}</YText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 58, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, margin: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, height: 42 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  hint: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  row: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: 6 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stopName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
});
