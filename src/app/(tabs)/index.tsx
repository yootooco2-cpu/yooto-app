import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Dimensions } from 'react-native';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { FavoritesButton } from '@/components/favorites/FavoritesButton';
import { MerchantCarousel } from '@/components/home/MerchantCarousel';
import { TerritoryCarousel } from '@/components/territory/TerritoryCarousel';
import { SectionScreen } from '@/components/theme/SectionScreen';
import { SupportContactFooter } from '@/components/ui/SupportContactFooter';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { buildDiscoveryContext, buildHomeSections, usePreferences } from '@/features/discovery';
import { SearchMenu, sortForDisplay, useMerchants, useMerchantSearchStore, withPhotoForDemo, type MerchantPredicate } from '@/features/merchants';
import { recentlyOpenedSource, verifiedProducersSource } from '@/features/territory/sources';

// Bande d'ambiance ≈ une hauteur d'écran : l'image d'univers se dissout TRÈS progressivement vers
// le fond sombre (fondu du BackgroundOverlay) et se prolonge sous la 1re section → aucune rupture.
const AMBIENT_HEIGHT = Math.round(Dimensions.get('window').height);

export default function HomeScreen() {
  const router = useRouter();
  const { data } = useMerchants();
  // Démo : ne garder que les commerces avec une vraie photo (aucun repli visible dans les cartes).
  const merchants = useMemo(() => withPhotoForDemo(data ?? []), [data]);
  // « Ils viennent d'ouvrir » reçoit le corpus COMPLET (décision produit Sprint 2) : les
  // créations SIRENE-first n'ont pas encore de photo — cette section assume le repli
  // premium, c'est sa raison d'être de montrer le tout-frais avant tout le monde.
  const allMerchants = useMemo(() => data ?? [], [data]);

  // Parallax TRÈS discret du fond d'ambiance (image d'univers) au scroll.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const userLocation = useMerchantSearchStore((s) => s.userLocation);
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
    <SectionScreen section="accueil" scrollY={scrollY} height={AMBIENT_HEIGHT}>
      <YScreen transparent scroll gap="lg" padding="lg" onScroll={scrollHandler}>
        {/* PREMIER élément fort : le MENU OFFICIEL PARTAGÉ (recherche + catégories + favoris). */}
        <SearchMenu
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
            {/* TERRITORY ENGINE (Sprint 1/J3) — le territoire VIVANT en tête : créations
                récentes prouvées par la date SIRENE. Source interchangeable, UI partagée. */}
            <TerritoryCarousel source={recentlyOpenedSource} merchants={allMerchants} delay={30} />
            <MerchantCarousel
              title="Recommandés aujourd'hui"
              subtitle="Les mieux notés près de vous"
              merchants={sections.recommendedToday}
              delay={60}
            />
            <MerchantCarousel
              title="À proximité"
              subtitle="Les commerces les plus proches de vous"
              merchants={sections.nearby}
              delay={120}
            />
            <MerchantCarousel
              title="À découvrir"
              subtitle="Une sélection à explorer"
              merchants={sections.toDiscover}
              delay={180}
            />
            {/* 2e source territoriale (jalon A-light) : la mission rendue visible —
                les producteurs dont l'activité agricole est PROUVÉE par le NAF. */}
            <TerritoryCarousel source={verifiedProducersSource} merchants={merchants} delay={240} />
          </>
        )}
        <SupportContactFooter />
      </YScreen>
    </SectionScreen>
  );
}
