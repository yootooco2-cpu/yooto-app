import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { FavoritesButton } from '@/components/favorites/FavoritesButton';
import { MerchantCarousel } from '@/components/home/MerchantCarousel';
import { TerritoryCarousel } from '@/components/territory/TerritoryCarousel';
import { SectionScreen } from '@/components/theme/SectionScreen';
import { SupportContactFooter } from '@/components/ui/SupportContactFooter';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { spacing } from '@/design/tokens/spacing';
import { buildDiscoveryContext, buildHomeSections, usePreferences } from '@/features/discovery';
import { SearchMenu, sortForDisplay, useMerchants, useMerchantSearchStore, withDistance, withPhotoForDemo, type MerchantPredicate } from '@/features/merchants';
import { recentlyOpenedSource, verifiedProducersSource } from '@/features/territory/sources';

// HÉRO immersif BORNÉ (≈ 55 % de l'écran, plafonné) : l'image d'univers porte la salutation,
// la recherche et les catégories, puis se dissout vers le fond crème — le reste de la page
// respire sur fond neutre (l'immersif est un héro, jamais un papier peint).
const AMBIENT_HEIGHT = Math.min(Math.round(Dimensions.get('window').height * 0.55), 560);

export default function HomeScreen() {
  const router = useRouter();
  const { data } = useMerchants();
  const userLocation = useMerchantSearchStore((s) => s.userLocation);
  // Position réelle → distances réelles (haversine, helper partagé). Sans position, `withDistance`
  // rend la liste inchangée : AUCUNE distance n'existe alors, et les intitulés/tris de proximité
  // se replient sur un mode neutre (voir `hasLocation` plus bas). Jamais de distance inventée.
  const located = useMemo(
    () => withDistance(data ?? [], userLocation ?? undefined),
    [data, userLocation],
  );
  const hasLocation = userLocation != null;
  // Démo : ne garder que les commerces avec une vraie photo (aucun repli visible dans les cartes).
  const merchants = useMemo(() => withPhotoForDemo(located), [located]);
  // « Ils viennent d'ouvrir » reçoit le corpus COMPLET (décision produit Sprint 2) : les
  // créations SIRENE-first n'ont pas encore de photo — cette section assume le repli
  // premium, c'est sa raison d'être de montrer le tout-frais avant tout le monde.
  const allMerchants = located;

  // Parallax TRÈS discret du fond d'ambiance (image d'univers) au scroll.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const preferences = usePreferences();
  const discoveryContext = useMemo(
    () => buildDiscoveryContext({ userLocation, preferences }),
    [userLocation, preferences],
  );

  const sections = useMemo(
    () =>
      buildHomeSections(merchants, {
        context: discoveryContext,
        limits: { recommendedToday: 8, nearby: 8, toDiscover: 8 },
      }),
    [merchants, discoveryContext],
  );

  // MENU OFFICIEL PARTAGÉ (identique à Carte & Commerçants) : recherche + catégories filtrent
  // l'Accueil EN PLACE. Sans filtre → sections éditoriales ; avec filtre → carrousel « Résultats ».
  const [query, setQuery] = useState('');
  const [categoryMatch, setCategoryMatch] = useState<MerchantPredicate | null>(null);
  const q = query.trim().toLowerCase();
  // Résultats de catégorie/recherche : TOUT le corpus (les fiches sans photo comprises),
  // ordonné par complétude — le score ordonne, il n'exclut jamais (décision 12/07).
  const filtered = useMemo(() => {
    let list = allMerchants;
    if (categoryMatch) list = list.filter(categoryMatch);
    if (q) list = list.filter((m) => `${m.name} ${m.description}`.toLowerCase().includes(q));
    return sortForDisplay(list);
  }, [allMerchants, categoryMatch, q]);
  const filtering = q.length > 0 || categoryMatch !== null;

  // Accueil ÉPURÉ, orienté action : on conserve le FOND D'AMBIANCE image de l'univers (discret,
  // blur + voile) mais SANS aucun texte héro par-dessus. La page démarre directement par la
  // recherche → catégories → recommandations.
  return (
    <SectionScreen section="accueil" scrollY={scrollY} height={AMBIENT_HEIGHT} scrollAway>
      <YScreen testID="screen-home" transparent scroll gap="lg" padding="lg" onScroll={scrollHandler}>
        {/* Header de marque : le logotype seul, posé sur le héro — identité immédiate, zéro bruit
            (pas de cloche ni de localisation tant que ces données réelles n'existent pas). */}
        <YText accessibilityRole="header" style={styles.brand}>
          YOOTOO
        </YText>

        {/* PREMIER élément fort : le MENU OFFICIEL PARTAGÉ (recherche + catégories + favoris),
            coiffé de la salutation — l'accueil accueille, puis invite à découvrir. */}
        <SearchMenu
          title="Bonjour 👋"
          subtitle="Que voulez-vous découvrir aujourd'hui ?"
          query={query}
          onQueryChange={setQuery}
          onCategoryChange={(m) => setCategoryMatch(() => m)}
          merchants={allMerchants}
          trailing={<FavoritesButton onPress={() => router.push('/explore')} />}
        />

        {filtering ? (
          filtered.length > 0 ? (
            <MerchantCarousel
              title="Résultats"
              subtitle={`${filtered.length} commerce${filtered.length > 1 ? 's' : ''} correspondant`}
              merchants={filtered}
            />
          ) : (
            <YText variant="body" color="muted">
              Aucun commerce ne correspond à votre recherche.
            </YText>
          )
        ) : (
          <>
            {/* ORDRE OFFICIEL (13/07) : proximité → recommandation → découverte → territoire.
                IMAGE FIRST préservé : la première section reste photographique. Les intitulés
                de proximité ne s'affichent QUE si la position est réelle — repli neutre sinon
                (jamais de proximité simulée). */}
            <MerchantCarousel
              title={hasLocation ? 'Autour de vous' : 'Dans votre secteur'}
              subtitle={
                hasLocation
                  ? 'Les commerces les plus proches de vous'
                  : 'Les commerces de votre territoire'
              }
              merchants={sections.nearby}
              seeAllHref="/merchants"
              delay={30}
            />
            <MerchantCarousel
              title="Recommandé aujourd'hui"
              subtitle={hasLocation ? 'Les mieux notés près de vous' : 'Les mieux notés de votre territoire'}
              merchants={sections.recommendedToday}
              seeAllHref="/merchants"
              delay={90}
            />
            <MerchantCarousel
              title="À découvrir"
              subtitle="Une sélection à explorer"
              merchants={sections.toDiscover}
              seeAllHref="/merchants"
              delay={150}
            />
            {/* TERRITORY ENGINE (Sprint 1/J3) — créations récentes prouvées par la date SIRENE.
                En bas de parcours : son repli sans photo est assumé, mais il ne fait plus la
                première impression de l'application. */}
            <TerritoryCarousel source={recentlyOpenedSource} merchants={allMerchants} delay={210} />
            {/* 2e source territoriale (jalon A-light) : la mission rendue visible —
                les producteurs dont l'activité agricole est PROUVÉE par le NAF. */}
            <TerritoryCarousel source={verifiedProducersSource} merchants={merchants} delay={270} />
          </>
        )}
        <SupportContactFooter />
      </YScreen>
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  // Logotype YOOTOO (même wordmark texte que le rail desktop), posé sur le héro : blanc cassé
  // de la DA verre + ombre douce (lisible sur les zones claires du ciel), rapproché de la
  // salutation pour former UN header (le gap d'écran est compensé, pas d'espacement arbitraire).
  brand: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 3,
    color: glass.onDark,
    marginBottom: -spacing.md,
    textShadowColor: 'rgba(23,32,26,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
