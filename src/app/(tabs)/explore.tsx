import { Feather } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
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
import { useSmartLocation } from '@/features/location';
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
import { MerchantCategoryBar } from '@/features/merchants/components/MerchantCategoryBar';
import { merchantCategoryById } from '@/features/merchants/merchantCategoryFilters';
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
const SNAP_POINTS = ['15%', '55%', '90%'];

// Voile dégradé du chrome : la carte disparaît PROGRESSIVEMENT sous la recherche/catégories
// (sombre au ras du status bar → transparent au niveau des catégories). Transition imperceptible.
const TOP_SCRIM = ['rgba(17,23,20,0.90)', 'rgba(17,23,20,0.45)', 'rgba(17,23,20,0)'] as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  // Catégorie principale sélectionnée : MÊME source partagée (store) que l'Accueil et
  // /commerçants. La barre de catégories vit sous la recherche (identique aux autres écrans) ;
  // ici elle post-filtre les marqueurs de la carte ET la liste, sans toucher useMerchantSearch.
  const activeCategory = useMerchantSearchStore((s) => s.activeCategory);
  const setActiveCategory = useMerchantSearchStore((s) => s.setActiveCategory);
  const categoryFilter = useMemo(() => merchantCategoryById(activeCategory), [activeCategory]);

  // Marqueurs affichés = filtrés par catégorie (sinon tous), PUIS par préférences carte
  // (producteurs / favoris) via PreferenceService — sans toucher au style Mapbox. `data` = commerce.
  const shownMarkers = useMemo(() => {
    const favSet = new Set(favoriteIds);
    const byCategory = categoryFilter ? markers.filter((mk) => !!mk.data && categoryFilter.match(mk.data)) : markers;
    return byCategory.filter(
      (mk) => !mk.data || PreferenceService.isMarkerVisible(mapPrefs, { isProducer: mk.data.isProducer, isFavorite: favSet.has(mk.data.id) }),
    );
  }, [markers, categoryFilter, mapPrefs, favoriteIds]);

  const merchantsInArea = useMemo(() => {
    const base = categoryFilter ? results.filter(categoryFilter.match) : results;
    return searchArea ? base.filter((m) => inBounds(m, searchArea)) : base;
  }, [results, searchArea, categoryFilter]);

  const selectedMerchant = results.find((m) => m.id === selectedId) ?? null;

  // DEUX ÉTATS D'INTERFACE pilotés par une SEULE source de vérité (selectedMerchant) :
  //  • Exploration (aucun commerce sélectionné) → chrome de carte visible ;
  //  • Consultation (une fiche ouverte)         → chrome masqué, priorité au commerce.
  // Les contrôles restent MONTÉS (jamais recréés) : on anime leur restauration/masquage via
  // `chromeProgress` (fade + translation) et on coupe `pointerEvents` quand masqués (aucun clic).
  const exploring = selectedMerchant === null;
  const chromeProgress = useDerivedValue(() => withTiming(exploring ? 1 : 0, { duration: 280 }), [exploring]);
  // Conteneur (chrome haut) : `box-none` laisse la carte cliquable dans les vides. FAB cliquables :
  // `auto`. Dans les DEUX cas, `none` en consultation → strictement aucun clic sur le chrome masqué.
  const chromeHint = exploring ? ('box-none' as const) : ('none' as const);
  const fabHint = exploring ? ('auto' as const) : ('none' as const);
  const topChromeStyle = useAnimatedStyle(() => ({
    opacity: chromeProgress.value,
    transform: [{ translateY: (1 - chromeProgress.value) * -14 }],
  }));
  const leftFabStyle = useAnimatedStyle(() => ({
    opacity: chromeProgress.value,
    transform: [{ translateX: (1 - chromeProgress.value) * -20 }],
  }));
  const rightFabStyle = useAnimatedStyle(() => ({
    opacity: chromeProgress.value,
    transform: [{ translateX: (1 - chromeProgress.value) * 20 }],
  }));

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
      <BottomSheetBackdrop {...props} appearsOnIndex={2} disappearsOnIndex={1} opacity={0.35} />
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

            {/* Accès rapide « Favoris » — contrôle d'EXPLORATION. Toujours monté (jamais recréé) :
                masqué + non-cliquable en consultation, restauré en fondu/translation à la fermeture. */}
            <AnimatedPressable
              onPress={() => setQuickAccessOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Favoris"
              pointerEvents={fabHint}
              style={[styles.favFab, glass.panel, shadows.md, { top: fabTop }, leftFabStyle]}>
              <Feather name="heart" size={18} color={glass.onDark} />
            </AnimatedPressable>

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

            {/* « Me recentrer » — contrôle d'EXPLORATION : masqué + non-cliquable en consultation. */}
            {showRecenter ? (
              <AnimatedPressable
                onPress={smart.recenter}
                accessibilityRole="button"
                accessibilityLabel="Me recentrer"
                pointerEvents={fabHint}
                style={[styles.recenterFab, glass.panel, shadows.md, { top: fabTop }, rightFabStyle]}>
                <Feather name="navigation" size={18} color={glass.onDark} />
              </AnimatedPressable>
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

            {/* CHROME FLOTTANT immersif (recherche + catégories + filtres). Contrôle d'EXPLORATION :
                TOUJOURS monté (jamais recréé). Masqué + non-cliquable en consultation (pointerEvents
                none), restauré en fondu + translation depuis le haut à la fermeture. */}
            <Animated.View
              style={[styles.topChrome, { paddingTop: insets.top + spacing.sm }, topChromeStyle]}
              onLayout={onChromeLayout}
              pointerEvents={chromeHint}>
              <LinearGradient
                colors={TOP_SCRIM}
                locations={[0, 0.62, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.topChromeInner} pointerEvents="box-none">
                <YSearchBar variant="glass" value={query} onChangeText={setQuery} />
                <MerchantCategoryBar
                  variant="glass"
                  active={activeCategory}
                  onToggle={(id) => setActiveCategory(activeCategory === id ? null : id)}
                />
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
            </Animated.View>

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
