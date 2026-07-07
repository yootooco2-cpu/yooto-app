import { Feather } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MapEngine,
  MapQuickAccessSheet,
  type QuickAccessSection,
} from '@/components/map';
import { MerchantDetailsSheet } from '@/components/merchants/MerchantDetailsSheet';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YChip } from '@/components/ui/YChip';
import { FloatingMapNavigation } from '@/components/navigation/FloatingMapNavigation';
import { SectionThemeProvider } from '@/design/theme/SectionThemeProvider';
import { PreferenceService } from '@/services/PreferenceService';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { useFocusStore, useIsDesktopWeb } from '@/features/layout';
import { useLocationSimulationStore, useSmartLocation } from '@/features/location';
import {
  isPlausibleViewport,
  useMapViewportStore,
  type MapCoordinate,
  type MapViewport,
} from '@/features/map';
import {
  filterCryptogramAsset,
  QUICK_FILTERS,
  useMerchantSearch,
  useMerchantSearchStore,
  type Merchant,
} from '@/features/merchants';
import { CategoryNavigation } from '@/features/merchants/components/CategoryNavigation';
import type { MerchantPredicate } from '@/features/merchants/categoryFamilies';
import { FavoritesList, useFavoriteIds, useFavoritesSync } from '@/features/favorites';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useSession } from '@/features/auth';
import { AuthSheet } from '@/components/auth/AuthSheet';

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

/** Paliers du bottom sheet : peek (aperçu) / mid (liste, sélection) / full (immersif). */
// Palier haut à 82 % (et non 90 %) : même fiche déployée, un bandeau reste libre en haut pour que
// la recherche et les catégories demeurent VISIBLES au-dessus de la carte en mode Consultation.
const SNAP_POINTS = ['15%', '55%', '82%'];

// Voile dégradé du chrome : la carte disparaît PROGRESSIVEMENT sous la recherche/catégories
// (sombre au ras du status bar → transparent au niveau des catégories). Transition imperceptible.
const TOP_SCRIM = ['rgba(17,23,20,0.90)', 'rgba(17,23,20,0.45)', 'rgba(17,23,20,0)'] as const;


export default function MapScreen() {
  // Synchro favoris (local-first + serveur si session) — hydrate au montage + après upgrade.
  useFavoritesSync();
  const { query, setQuery, filters, toggleFilter, location, userLocation, nearbyActive, results, markers, isLoading, isError, refetch } =
    useMerchantSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);

  // Déclencheur JIT : quand l'utilisateur crée quelque chose à garder (favori) et n'est pas
  // encore authentifié, la feuille d'inscription surgit UNE fois (jamais bloquante).
  const favoriteIds = useFavoriteIds();
  const { settings } = useSettings();
  const mapPrefs = settings.map;
  const { status: sessionStatus } = useSession();
  const [authSheetOpen, setAuthSheetOpen] = useState(false);
  const authPromptedRef = useRef(false);
  useEffect(() => {
    if (favoriteIds.length > 0 && sessionStatus !== 'authenticated' && !authPromptedRef.current) {
      authPromptedRef.current = true;
      setAuthSheetOpen(true);
    }
  }, [favoriteIds.length, sessionStatus]);

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
  // → on mémorise seulement le live (la zone validée ne bouge plus toute seule).
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

  // Navigation catégories à DEUX niveaux (familles → sous-catégories), propre à la carte.
  // Elle ne remonte qu'un PRÉDICAT de filtrage (`mapMatch`) : on POST-filtre les marqueurs et la
  // liste, sans toucher useMerchantSearch ni le Discovery Engine, et sans bouger la caméra.
  const [mapMatch, setMapMatch] = useState<MerchantPredicate | null>(null);

  // Marqueurs affichés = filtrés par catégorie (sinon tous), PUIS par préférences carte
  // (producteurs / favoris) via PreferenceService — sans toucher au style Mapbox. `data` = commerce.
  const shownMarkers = useMemo(() => {
    const favSet = new Set(favoriteIds);
    const byCategory = mapMatch ? markers.filter((mk) => !!mk.data && mapMatch(mk.data)) : markers;
    return byCategory.filter(
      (mk) => !mk.data || PreferenceService.isMarkerVisible(mapPrefs, { isProducer: mk.data.isProducer, isFavorite: favSet.has(mk.data.id) }),
    );
  }, [markers, mapMatch, mapPrefs, favoriteIds]);

  const merchantsInArea = useMemo(() => {
    const base = mapMatch ? results.filter(mapMatch) : results;
    return searchArea ? base.filter((m) => inBounds(m, searchArea)) : base;
  }, [results, searchArea, mapMatch]);

  const selectedMerchant = results.find((m) => m.id === selectedId) ?? null;

  // DEUX ÉTATS D'INTERFACE, une SEULE source de vérité (selectedMerchant) :
  //  • ExploreMode (selectedMerchant === null) → recherche + catégories + carte + MENU LATÉRAL ;
  //  • MerchantFocusMode (selectedMerchant !== null) → recherche + catégories + carte + FICHE,
  //    et SEUL le menu latéral est masqué. On ne cache jamais la recherche ni les catégories.
  const exploring = selectedMerchant === null;

  // Mode Focus Commerce : desktop-web + un commerce sélectionné. Écrivain UNIQUE de l'état
  // partagé `isFocus` (lu par le panneau/le sheet ici, et par la tab bar dans (tabs)/_layout).
  const isDesktopWeb = useIsDesktopWeb();
  // L'écran carte reste MONTÉ quand on change d'onglet (tabs) : sans cette garde, le Focus
  // (qui masque la tab bar) resterait actif sur Accueil tant qu'un commerce est sélectionné.
  const isScreenFocused = useIsFocused();
  const setFocus = useFocusStore((s) => s.setFocus);
  useEffect(() => {
    // Focus Commerce UNIQUEMENT si l'écran carte est au premier plan → dès qu'on navigue
    // ailleurs, on relâche le Focus et la tab bar réapparaît.
    setFocus(isScreenFocused && isDesktopWeb && selectedId !== null);
  }, [isScreenFocused, isDesktopWeb, selectedId, setFocus]);
  // Filet de sécurité : démontage de l'écran carte restaure la tab bar.
  useEffect(() => () => setFocus(false), [setFocus]);

  // Localisation intelligente (PR1) : soft-ask après délai + recentrage. Jamais au lancement.
  const setUserLocation = useMerchantSearchStore((s) => s.setUserLocation);
  const smart = useSmartLocation({ userLocation, onLocate: setUserLocation });

  // Simulation GPS (DEV) : dès qu'on active/change un point simulé, on recentre la carte dessus
  // pour que la vue montre bien les commerces « autour de » cette position (la synchro app-wide
  // met déjà à jour `userLocation` pour distances/recommandations).
  const simEnabled = useLocationSimulationStore((s) => s.enabled);
  const simPlace = useLocationSimulationStore((s) => s.place);
  const recenterMap = smart.recenter;
  useEffect(() => {
    if (__DEV__ && simEnabled && simPlace) recenterMap();
  }, [simEnabled, simPlace, recenterMap]);

  // « Me recentrer » : visible seulement si la position est connue ET hors du viewport courant.
  const showRecenter = Boolean(
    userLocation && liveViewport && !coordInViewport(userLocation, liveViewport),
  );

  // Snap à la sélection : on étend le sheet pour révéler la mini-fiche, on revient au peek à la fermeture.
  // Palier d'ouverture : desktop/web → expanded direct (le scroll molette exige le palier haut) ;
  // mobile → default (le drag tactile déploie ensuite naturellement vers expanded).
  const defaultSheetIndex = isDesktopWeb ? 2 : 1;
  useEffect(() => {
    sheetRef.current?.snapToIndex(selectedId ? defaultSheetIndex : 0);
  }, [selectedId, defaultSheetIndex]);

  // Immersion : la carte est plein écran, le chrome (recherche + catégories) FLOTTE au-dessus.
  // On mesure sa hauteur pour poser les FAB juste en dessous du voile, jamais sous la recherche.
  const insets = useSafeAreaInsets();
  const [chromeHeight, setChromeHeight] = useState(0);
  const onChromeLayout = useCallback((e: LayoutChangeEvent) => setChromeHeight(e.nativeEvent.layout.height), []);
  const fabTop = chromeHeight > 0 ? chromeHeight + spacing.sm : insets.top + 132;

  // Liste virtualisée du bottom sheet (rendu de ligne stable).
  // Backdrop premium : n'assombrit qu'au palier plein écran (index 2) → carte interactive au peek/mid.
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={2} disappearsOnIndex={1} opacity={0.18} />
    ),
    [],
  );

  const count = merchantsInArea.length;
  const showEmpty = !isLoading && !isError && searchArea !== null && count === 0;

  // Accès rapide — architecture À SECTIONS : V1 = « Favoris ». Ajouter « Collections »,
  // « Récents »… = pousser une entrée ici, sans toucher ni le sheet ni le reste de l'écran.
  const openMerchantFromQuickAccess = useCallback((id: string) => {
    setSelectedId(id);
    setQuickAccessOpen(false);
  }, []);
  const quickAccessSections = useMemo<QuickAccessSection[]>(
    () => [
      {
        id: 'favorites',
        title: 'Favoris',
        render: () => <FavoritesList merchants={results} onSelect={openMerchantFromQuickAccess} />,
      },
    ],
    [results, openMerchantFromQuickAccess],
  );

  return (
    <SectionThemeProvider section="carte">
      <View style={styles.root}>
      <View style={styles.screenWrap}>
      {/* Immersion : la carte est le FOND plein écran ; tout le chrome flotte au-dessus (voile
          dégradé + verre) → plus aucune rupture « carte / barre / catégories ». */}
      <View style={styles.mapArea}>
        {isError ? (
          <View style={[styles.errorWrap, { paddingTop: insets.top + spacing.xl }]}>
            <YCard variant="outline">
              <YText variant="subtitle">Impossible de charger les commerces</YText>
              <YText variant="body" color="muted">
                Vérifiez votre connexion, puis réessayez.
              </YText>
              <YButton label="Réessayer" variant="secondary" onPress={() => void refetch()} />
            </YCard>
          </View>
        ) : (
          <View style={styles.mapRow}>
            <View style={styles.mapCol}>
            {/* La carte est rendue IMMÉDIATEMENT (jamais bloquée par le chargement des données)
                → visible en < 3 s ; les marqueurs apparaissent dès que les données arrivent. */}
            <MapEngine
              fill
              markers={shownMarkers}
              selectedId={selectedId}
              userLocation={userLocation}
              userAccuracy={smart.accuracy}
              recenterToken={smart.recenterToken}
              initialCamera={initialCamera}
              onSelectMarker={setSelectedId}
              onViewportChange={handleViewport}
            />

            {/* Accès rapide « Favoris » — reste visible dans les deux modes (contrôle carte). */}
            <Pressable
              onPress={() => setQuickAccessOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Favoris"
              style={[styles.favFab, glass.panel, shadows.md, { top: fabTop }]}>
              <Feather name="heart" size={18} color={glass.onDark} />
            </Pressable>

            {/* Bottom sheet « Favoris » (overlay Modal, aucun impact moteur carte). */}
            <MapQuickAccessSheet
              open={quickAccessOpen}
              onClose={() => setQuickAccessOpen(false)}
              sections={quickAccessSections}
            />

            {/* Navigation VERTICALE flottante — TOUJOURS montée (jamais recréée). Masquée +
                non-cliquable en consultation, restaurée en fondu/translation en exploration. */}
            <FloatingMapNavigation visible={exploring} />

            {/* Feuille d'auth JUSTE-À-TEMPS (surgit après le 1er favori, non bloquante). */}
            <AuthSheet
              open={authSheetOpen}
              onClose={() => setAuthSheetOpen(false)}
              favoritesCount={favoriteIds.length}
            />

            {/* « Me recentrer » — reste visible dans les deux modes (contrôle carte). */}
            {showRecenter ? (
              <Pressable
                onPress={smart.recenter}
                accessibilityRole="button"
                accessibilityLabel="Me recentrer"
                style={[styles.recenterFab, glass.panel, shadows.md, { top: fabTop }]}>
                <Feather name="navigation" size={18} color={glass.onDark} />
              </Pressable>
            ) : null}

            {/* Chargement (le compteur de zone vit désormais dans l'en-tête du bottom sheet). */}
            {isLoading ? (
              <View style={[styles.counterChip, glass.panel, shadows.sm, { top: fabTop }]}>
                <YText variant="caption" style={styles.counterText}>
                  Chargement des commerces…
                </YText>
              </View>
            ) : null}

            {/* État vide : aucune Maison dans le viewport courant. */}
            {showEmpty ? (
              <View style={styles.emptyWrap} pointerEvents="none">
                <View style={[styles.emptyCard, glass.panel, shadows.md]}>
                  <YText variant="body" style={styles.emptyText}>
                    Aucun commerce visible ici — dézoomez ou recherchez une autre zone.
                  </YText>
                </View>
              </View>
            ) : null}

            {/* Feuille du bas RÉDUITE À L'APERÇU : n'apparaît QUE lorsqu'un marqueur est sélectionné
                (mini-fiche du commerce). Plus de liste « X commerces dans cette zone » → carte seule. */}
            {/* Bottom sheet UNIQUE (mobile ET desktop) : jamais de panneau latéral. Sur desktop,
                la feuille est simplement plus large et centrée. 3 paliers (peek/default/expanded),
                contenu scrollable (horaires, contact, à propos, tags, photos). */}
            {selectedMerchant ? (
              <BottomSheet
                ref={sheetRef}
                index={defaultSheetIndex}
                snapPoints={SNAP_POINTS}
                enableDynamicSizing={false}
                enablePanDownToClose={false}
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={styles.sheetHandle}
                backgroundStyle={[styles.sheetBackground, glass.panel, styles.sheetOpaque]}
                /* Le CONTENEUR racine (pas seulement la feuille) doit dominer les marqueurs
                   Mapbox : un marqueur positionné à z-index ≥ 1 passe sinon devant un conteneur
                   à z-index auto. On isole donc la couche fiche au-dessus de la carte. */
                containerStyle={styles.sheetContainer}
                style={[styles.sheetShadow, isDesktopWeb && styles.sheetDesktop]}>
                <MerchantDetailsSheet
                  merchant={selectedMerchant}
                  onClose={() => setSelectedId(null)}
                  onOpenFull={() => sheetRef.current?.snapToIndex(2)}
                />
              </BottomSheet>
            ) : null}

            {/* CHROME FLOTTANT immersif (recherche + catégories + filtres). TOUJOURS visible, dans
                les DEUX modes — jamais masqué. box-none → la carte reste interactive dans les vides. */}
            <View
              style={[styles.topChrome, { paddingTop: insets.top + spacing.sm }]}
              onLayout={onChromeLayout}
              pointerEvents="box-none">
              <LinearGradient
                colors={TOP_SCRIM}
                locations={[0, 0.62, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.topChromeInner} pointerEvents="box-none">
                <YSearchBar variant="glass" value={query} onChangeText={setQuery} />
                {/* Navigation catégories à 2 niveaux (grandes familles → sous-catégories). */}
                <CategoryNavigation onChange={setMapMatch} />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filtersScroll}
                  contentContainerStyle={styles.filters}>
                  {QUICK_FILTERS.map((filter) => (
                    <YChip
                      key={filter.id}
                      label={filter.label}
                      icon={filterCryptogramAsset(filter.id)}
                      active={filters.includes(filter.id)}
                      onPress={() => toggleFilter(filter.id)}
                      variant="glass"
                    />
                  ))}
                </ScrollView>
                {nearbyActive && location.status === 'denied' ? (
                  <YText variant="caption" style={styles.nearbyDenied}>
                    Localisation indisponible — activez-la pour trier par distance.
                  </YText>
                ) : null}
              </View>
            </View>

            </View>
          </View>
        )}
      </View>
      </View>
      </View>
    </SectionThemeProvider>
  );
}

const styles = StyleSheet.create({
  // Racine : en Focus desktop, [rail pleine hauteur | contenu]. Hors Focus, un seul enfant → rendu actuel.
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  screenWrap: {
    flex: 1,
  },
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
  mapRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mapCol: {
    flex: 1,
  },
  // Chrome flottant : superposé en HAUT de la carte (jamais en flux) → aucune coupure.
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing.xl,
    zIndex: 8,
  },
  topChromeInner: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  nearbyDenied: {
    color: glass.onDarkMuted,
    paddingHorizontal: spacing.xs,
  },
  // Erreur réseau : la carte n'est pas rendue → carte de secours centrée sur le fond de section.
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
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
    zIndex: 20,
  },
  // Accès rapide « Favoris » — miroir du recentrage, côté GAUCHE (le verre dépoli vient du token).
  favFab: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  counterChip: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm + 52,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    zIndex: 20,
  },
  counterText: {
    color: glass.onDark,
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
    color: glass.onDark,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(243,238,226,0.45)',
  },
  // Fond du sheet : verre dépoli sombre (le token `glass.panel` fournit fond + flou + bordure).
  sheetBackground: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  // Fond fiche quasi opaque (couleur DA de référence #111714) : garde le dépoli mais MASQUE
  // totalement les commerces situés derrière → lecture des boutons/horaires jamais gênée.
  sheetOpaque: {
    backgroundColor: 'rgba(17,23,20,0.95)',
  },
  // CONTENEUR racine de la bottom sheet : couche visuelle prioritaire, au-dessus de TOUTE la
  // carte (marqueurs z 1-6, clusters, callouts, overlays Mapbox). La partie transparente laisse
  // passer les interactions carte (box-none) ; seule la fiche opaque masque les commerces derrière.
  sheetContainer: {
    zIndex: 100,
    elevation: 32,
  },
  sheetShadow: {
    ...shadows.lg,
  },
  // Desktop / large : la feuille reste une BOTTOM sheet (jamais latérale), simplement plus
  // étroite et centrée horizontalement pour une lecture premium sur grand écran.
  sheetDesktop: {
    maxWidth: 720,
    marginHorizontal: 'auto',
    left: 0,
    right: 0,
  },
});
