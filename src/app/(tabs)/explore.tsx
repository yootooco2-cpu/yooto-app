import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MapEngine, MapMerchantPreview } from '@/components/map';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YChip } from '@/components/ui/YChip';
import { YScreen } from '@/components/ui/YScreen';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { LocationPrompt, useSmartLocation } from '@/features/location';
import {
  isPlausibleViewport,
  useMapViewportStore,
  type MapCoordinate,
  type MapViewport,
} from '@/features/map';
import {
  CATEGORY_LABELS,
  getMerchantCoverPhoto,
  QUICK_FILTERS,
  useMerchantSearch,
  useMerchantSearchStore,
  type Merchant,
} from '@/features/merchants';

/** Un commerce est-il dans l'emprise du viewport ? (bbox simple, France → pas d'antiméridien). */
function inBounds(m: Merchant, v: MapViewport): boolean {
  const { latitude: lat, longitude: lng } = m.coordinates;
  const { west, south, east, north } = v.bounds;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

/** La position utilisateur est-elle dans l'emprise du viewport ? */
function coordInViewport(c: MapCoordinate, v: MapViewport): boolean {
  const { west, south, east, north } = v.bounds;
  return c.longitude >= west && c.longitude <= east && c.latitude >= south && c.latitude <= north;
}

/** La carte a-t-elle « assez bougé » depuis la zone validée pour proposer une re-recherche ? */
function viewportMoved(area: MapViewport, live: MapViewport): boolean {
  const dLng = Math.abs(live.center.longitude - area.center.longitude);
  const dLat = Math.abs(live.center.latitude - area.center.latitude);
  const w = area.bounds.east - area.bounds.west;
  const h = area.bounds.north - area.bounds.south;
  return Math.abs(live.zoom - area.zoom) > 0.4 || dLng > w * 0.35 || dLat > h * 0.35;
}

/** Égalité stricte de viewport → permet des `setState` IDEMPOTENTS (aucune boucle de rendu). */
function sameViewport(a: MapViewport | null, b: MapViewport): boolean {
  if (!a) return false;
  const e = 1e-6;
  return (
    Math.abs(a.zoom - b.zoom) < 1e-3 &&
    Math.abs(a.center.latitude - b.center.latitude) < e &&
    Math.abs(a.center.longitude - b.center.longitude) < e &&
    Math.abs(a.bounds.west - b.bounds.west) < e &&
    Math.abs(a.bounds.east - b.bounds.east) < e &&
    Math.abs(a.bounds.south - b.bounds.south) < e &&
    Math.abs(a.bounds.north - b.bounds.north) < e
  );
}

const LIST_MAX = 40;

export default function MapScreen() {
  const router = useRouter();
  const { query, setQuery, filters, toggleFilter, location, userLocation, nearbyActive, results, markers, isLoading, isError, refetch } =
    useMerchantSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Persistance session : viewport à restaurer (lu UNE fois au montage) + setter.
  const setLastViewport = useMapViewportStore((s) => s.setLastViewport);
  const initialCamera = useMemo(() => {
    const v = useMapViewportStore.getState().lastViewport;
    return isPlausibleViewport(v) ? { center: v.center, zoom: v.zoom } : undefined;
  }, []);

  // Zone VALIDÉE (filtre compteur + liste) vs viewport LIVE (dernier état caméra).
  const [searchArea, setSearchArea] = useState<MapViewport | null>(null);
  const [liveViewport, setLiveViewport] = useState<MapViewport | null>(null);

  // Programmatique (cadrage initial, zoom cluster) → auto-valide la zone. Geste utilisateur
  // → on mémorise seulement le live et on propose « Rechercher dans cette zone ».
  const handleViewport = useCallback(
    (v: MapViewport, userInitiated: boolean) => {
      // IDEMPOTENT : si le viewport est inchangé, on renvoie `prev` → React n'effectue aucun
      // re-render (protège contre toute boucle rendu ↔ cadrage carte).
      setLiveViewport((prev) => (sameViewport(prev, v) ? prev : v));
      setSearchArea((prev) => {
        if (userInitiated && prev) return prev; // geste utilisateur → on ne re-valide pas la zone
        return sameViewport(prev, v) ? prev : v;
      });
      // Persistance session : on mémorise toujours le dernier viewport (centre + zoom + emprise).
      setLastViewport(v);
    },
    [setLastViewport],
  );

  const merchantsInArea = useMemo(
    () => (searchArea ? results.filter((m) => inBounds(m, searchArea)) : results),
    [results, searchArea],
  );

  const moved = Boolean(liveViewport && searchArea && viewportMoved(searchArea, liveViewport));
  const selectedMerchant = results.find((m) => m.id === selectedId) ?? null;

  const onSearchHere = () => {
    if (liveViewport) setSearchArea(liveViewport);
  };

  // Localisation intelligente (PR1) : soft-ask après délai + recentrage. Jamais au lancement.
  const setUserLocation = useMerchantSearchStore((s) => s.setUserLocation);
  const smart = useSmartLocation({ userLocation, onLocate: setUserLocation });
  // « Me recentrer » : visible seulement si la position est connue ET hors du viewport courant.
  const showRecenter = Boolean(
    userLocation && liveViewport && !coordInViewport(userLocation, liveViewport),
  );

  const count = merchantsInArea.length;
  const showEmpty = !isLoading && !isError && searchArea !== null && count === 0;

  return (
    <YScreen gap="sm" padding="lg">
      <YSearchBar value={query} onChangeText={setQuery} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}>
        {QUICK_FILTERS.map((filter) => (
          <YChip
            key={filter.id}
            label={filter.label}
            active={filters.includes(filter.id)}
            onPress={() => toggleFilter(filter.id)}
          />
        ))}
      </ScrollView>

      {nearbyActive && location.status === 'denied' ? (
        <YText variant="caption" color="muted">
          Localisation indisponible — activez-la pour trier par distance.
        </YText>
      ) : null}

      <View style={styles.mapArea}>
        {isError ? (
          <YCard variant="outline">
            <YText variant="subtitle">Impossible de charger les commerces</YText>
            <YText variant="body" color="muted">
              Vérifiez votre connexion, puis réessayez.
            </YText>
            <YButton label="Réessayer" variant="secondary" onPress={() => void refetch()} />
          </YCard>
        ) : (
          <>
            {/* La carte est rendue IMMÉDIATEMENT (jamais bloquée par le chargement des données)
                → visible en < 3 s ; les marqueurs apparaissent dès que les données arrivent. */}
            <MapEngine
              fill
              markers={markers}
              selectedId={selectedId}
              userLocation={userLocation}
              userAccuracy={smart.accuracy}
              recenterToken={smart.recenterToken}
              initialCamera={initialCamera}
              onSelectMarker={setSelectedId}
              onViewportChange={handleViewport}
            />

            {/* « Me recentrer » — visible uniquement si la position est connue et hors du viewport. */}
            {showRecenter ? (
              <Pressable
                onPress={smart.recenter}
                accessibilityRole="button"
                accessibilityLabel="Me recentrer"
                style={[styles.recenterFab, shadows.md]}>
                <Feather name="navigation" size={18} color={colors.primary} />
              </Pressable>
            ) : null}

            {/* Compteur : commerces de la ZONE (viewport), jamais le total global. */}
            <View style={[styles.counterChip, shadows.sm]}>
              <YText variant="caption" style={styles.counterText}>
                {isLoading
                  ? 'Chargement des commerces…'
                  : `${count} commerce${count > 1 ? 's' : ''} dans cette zone`}
              </YText>
            </View>

            {/* Re-recherche après déplacement/zoom utilisateur. */}
            {moved ? (
              <View style={styles.searchHereWrap}>
                <YButton label="Rechercher dans cette zone" onPress={onSearchHere} />
              </View>
            ) : null}

            {/* État vide : aucune Maison dans le viewport courant. */}
            {showEmpty ? (
              <View style={styles.emptyWrap} pointerEvents="none">
                <View style={[styles.emptyCard, shadows.md]}>
                  <YText variant="body" style={styles.emptyText}>
                    Aucun commerce visible ici — dézoomez ou recherchez une autre zone.
                  </YText>
                </View>
              </View>
            ) : null}

            {/* Bas : fiche du commerce sélectionné, sinon liste filtrée par la zone. */}
            {selectedMerchant ? (
              <View style={styles.previewWrap}>
                <MapMerchantPreview
                  merchant={selectedMerchant}
                  onClose={() => setSelectedId(null)}
                  onPress={() =>
                    router.push({ pathname: '/merchant/[id]', params: { id: selectedMerchant.id } })
                  }
                />
              </View>
            ) : !isLoading && count > 0 ? (
              <View style={styles.listWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}>
                  {merchantsInArea.slice(0, LIST_MAX).map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => setSelectedId(m.id)}
                      accessibilityRole="button"
                      accessibilityLabel={m.name}
                      style={[styles.card, shadows.sm]}>
                      <MerchantPhoto uri={getMerchantCoverPhoto(m)} height={84} rounded={radii.md} />
                      <YText variant="caption" numberOfLines={1} style={styles.cardTitle}>
                        {m.name}
                      </YText>
                      <YText variant="caption" color="muted" numberOfLines={1}>
                        {[CATEGORY_LABELS[m.category], m.city].filter(Boolean).join(' · ')}
                      </YText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Localisation « service » : carte soft-ask (jamais au lancement, dismissable). */}
            {smart.showPrompt ? (
              <View style={styles.promptWrap}>
                <LocationPrompt onAuthorize={smart.authorize} onDismiss={smart.dismiss} />
              </View>
            ) : null}
          </>
        )}
      </View>
    </YScreen>
  );
}

const styles = StyleSheet.create({
  filtersScroll: {
    flexGrow: 0,
  },
  filters: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
    alignItems: 'center',
  },
  mapArea: {
    flex: 1,
  },
  recenterFab: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptWrap: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    zIndex: 10,
  },
  counterChip: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  counterText: {
    color: colors.text,
  },
  searchHereWrap: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
  },
  emptyWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    maxWidth: 320,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text,
  },
  previewWrap: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
  },
  listWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.sm,
  },
  listContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  card: {
    width: 168,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  fillCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
