import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { getMapConfig } from '@/features/map/config';
import { useMerchantSearchStore } from '@/features/merchants';
import { ModeSelector } from '@/features/transit/components/ModeSelector';
import { StopSheet, type SheetState } from '@/features/transit/components/StopSheet';
import { TransitMap, type TransitMapFocus } from '@/features/transit/components/TransitMap';
import { clusterForZoom, filterByMode, resolveSelected, visibleStations, type StationWithRoutes, type TransitMode } from '@/features/transit/mapModel';
import { groupStopsIntoStations } from '@/features/transit/stations';
import { useStationDepartures } from '@/features/transit/useStationDepartures';
import { useTransitRoutes, useTransitStops, useTransitStopServices } from '@/features/transit';
import type { TransitRoute } from '@/features/transit';
import { haversineKm } from '@/lib/geo/haversine';

/**
 * Bus & Tram — organisation « Carte interactive » : carte Mapbox (style YOOTOO gelé,
 * AUCUN commerce), barre flottante (recherche + Tous/Tramway/Bus + recentrage),
 * bottom sheet à trois états. Moteur, horaires, GTFS/GTFS-RT inchangés.
 */
export default function BusTramScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets(); // la barre flottante ne passe JAMAIS sous la Dynamic Island
  const userLocation = useMerchantSearchStore((s) => s.userLocation);
  const stops = useTransitStops();
  const routes = useTransitRoutes();
  const services = useTransitStopServices();

  const [mode, setMode] = useState<TransitMode>('tous');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('mid');
  const defaultCenter = getMapConfig().defaultRegion.center; // Montpellier (sans géoloc)
  const [region, setRegion] = useState(() => ({ center: userLocation ?? defaultCenter, zoom: 15.2 }));
  const [focus, setFocus] = useState<TransitMapFocus | null>(
    () => ({ ...(userLocation ?? defaultCenter), zoom: 15.2, token: 0 }),
  );
  const focusToken = useRef(1);
  const regionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Référentiel : stations (quais fusionnés) + lignes desservies (desserte agrégée 021).
  const stations: (StationWithRoutes & { distanceKm?: number })[] = useMemo(() => {
    const routesByPk = new Map((routes.data ?? []).map((r) => [r.id, r]));
    const byStopPk = new Map<number, TransitRoute[]>();
    for (const s of services.data ?? []) {
      const route = routesByPk.get(s.routePk);
      if (!route) continue;
      const list = byStopPk.get(s.stopPk) ?? [];
      if (!list.some((r) => r.id === route.id)) list.push(route);
      byStopPk.set(s.stopPk, list);
    }
    return groupStopsIntoStations(stops.data ?? []).map((st) => ({
      ...st,
      routes: [...new Map(st.stopPks.flatMap((pk) => byStopPk.get(pk) ?? []).map((r) => [r.id, r])).values()]
        .sort((a, b) => (a.shortName ?? '').localeCompare(b.shortName ?? '', 'fr', { numeric: true })),
      distanceKm: userLocation ? haversineKm(userLocation, st) : undefined,
    })).filter((s) => s.routes.length > 0);
  }, [stops.data, routes.data, services.data, userLocation]);

  // Filtre Tous/Tramway/Bus (carte ET sheet simultanément) puis recherche arrêt/ligne.
  const filtered = useMemo(() => {
    const byMode = filterByMode(stations, mode);
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const q = norm(search.trim());
    if (!q) return byMode;
    // Numéro de ligne exact → UNIQUEMENT les arrêts de cette ligne ; sinon filtre par nom/préfixe.
    const lineMatches = byMode.filter((s) => s.routes.some((r) => norm(r.shortName ?? '') === q));
    if (lineMatches.length) return lineMatches;
    return byMode.filter((s) => norm(s.name).includes(q) || s.routes.some((r) => norm(r.shortName ?? '').startsWith(q)));
  }, [stations, mode, search]);

  // Liste du sheet : triée par distance (ou nom sans géoloc, assumé et annoncé).
  const listStations = useMemo(
    () => [...filtered].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.name.localeCompare(b.name, 'fr')),
    [filtered],
  );

  // Carte : uniquement le secteur visible (marge incluse) puis regroupement — jamais tout.
  const mapItems = useMemo(
    () => clusterForZoom(visibleStations(filtered, region.center, region.zoom), region.zoom),
    [filtered, region],
  );

  // BUG corrigé : la sélection est résolue sur le RÉFÉRENTIEL COMPLET — un changement de
  // ligne/mode/recherche ne la tue jamais ; il restreint seulement les lignes affichées.
  const selection = useMemo(() => resolveSelected(stations, selectedId, mode), [stations, selectedId, mode]);
  const selected = selection ? { ...selection.station, routes: selection.servesMode ? selection.routesForMode : selection.station.routes } : null;
  const schedule = useStationDepartures(selection?.station ?? undefined);

  const selectStation = useCallback((id: number) => {
    const st = stations.find((s) => s.id === id);
    setSelectedId(id);
    setSelectedRouteId((prev) => (id === selectedId ? prev : null)); // autre arrêt → filtre de ligne relâché
    setSheetState('reduced');
    if (st) setFocus({ latitude: st.latitude, longitude: st.longitude, zoom: 15.6, token: focusToken.current++ });
  }, [stations, selectedId]);

  // Toucher une LIGNE (chip) ouvre la fiche complète dessus ; `null` relâche le filtre sans bouger.
  const selectRoute = useCallback((routeId: string | null) => {
    setSelectedRouteId(routeId);
    if (routeId) setSheetState('full');
  }, []);

  const onRegionChange = useCallback((center: { latitude: number; longitude: number }, zoom: number) => {
    // Recalculs limités pendant le déplacement : coalescing court après moveend.
    if (regionTimer.current) clearTimeout(regionTimer.current);
    regionTimer.current = setTimeout(() => setRegion({ center, zoom }), 120);
  }, []);

  const recenter = useCallback(() => {
    const c = userLocation ?? defaultCenter;
    setFocus({ latitude: c.latitude, longitude: c.longitude, zoom: 15.6, token: focusToken.current++ });
  }, [userLocation, defaultCenter]);

  // Retour : rétablit l'état précédent (sélection → liste), puis quitte l'écran.
  const goBack = useCallback(() => {
    if (selectedId !== null) { setSelectedId(null); setSelectedRouteId(null); setSheetState('mid'); return; }
    if (router.canGoBack()) router.back(); else router.replace('/');
  }, [selectedId, router]);

  const refreshAll = useCallback(() => {
    void stops.refetch(); void routes.refetch(); void services.refetch();
    schedule.refresh();
  }, [stops, routes, services, schedule]);

  const loading = stops.isLoading || routes.isLoading || services.isLoading;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Carte plein cadre (le sheet réduit laisse ~60 % de carte visible). */}
      <View style={styles.mapLayer}>
        <TransitMap
          items={mapItems}
          selectedId={selectedId}
          onSelectStation={selectStation}
          onSelectCluster={(c) => setFocus({ latitude: c.latitude, longitude: c.longitude, zoom: region.zoom + 1.6, token: focusToken.current++ })}
          onRegionChange={onRegionChange}
          userLocation={userLocation}
          focus={focus}
        />
      </View>

      {/* Barre supérieure flottante (glassmorphism YOOTOO). */}
      <View style={[styles.topBar, { top: insets.top + spacing.xs }]}>
        <View style={[styles.searchRow, glass.panel]}>
          <Pressable onPress={goBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="Retour" style={styles.iconBtn}>
            <Feather name="chevron-left" size={22} color={glass.onDark} />
          </Pressable>
          <Feather name="search" size={15} color={glass.onDarkMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Arrêt ou numéro de ligne…"
            placeholderTextColor={glass.onDarkMuted}
            style={[styles.searchInput, { color: glass.onDark }]}
            accessibilityLabel="Rechercher un arrêt ou une ligne"
          />
          <Pressable onPress={recenter} hitSlop={8} accessibilityRole="button" accessibilityLabel="Recentrer sur ma position" style={styles.iconBtn}>
            <Feather name="crosshair" size={18} color={glass.onDark} />
          </Pressable>
        </View>
        <ModeSelector mode={mode} onChange={setMode} />
        {loading ? (
          <View style={[glass.panel, styles.loadingHint]}>
            <YText variant="caption" style={{ color: glass.onDark }}>Chargement des arrêts TaM…</YText>
          </View>
        ) : null}
      </View>

      <StopSheet
        servesMode={selection?.servesMode ?? true}
        mode={mode}
        state={sheetState}
        onState={setSheetState}
        screenHeight={screenHeight}
        stations={listStations}
        selected={selected}
        onSelect={selectStation}
        onCloseSelection={() => { setSelectedId(null); setSelectedRouteId(null); setSheetState('mid'); }}
        selectedRouteId={selectedRouteId}
        onSelectRoute={selectRoute}
        schedule={schedule}
        refreshing={stops.isRefetching || services.isRefetching}
        onRefreshAll={refreshAll}
        noGeo={!userLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  topBar: { position: 'absolute', left: spacing.md, right: spacing.md, gap: spacing.xs },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    borderRadius: radii.xl, paddingHorizontal: spacing.xs, minHeight: 48,
  },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  // Pilule glass sombre : texte lisible (AA) quel que soit le fond de carte dessous.
  loadingHint: { alignSelf: 'flex-start', borderRadius: radii.lg, paddingHorizontal: spacing.sm, paddingVertical: 4 },
});
