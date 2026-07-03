import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { HomeHero } from '@/components/home/HomeHero';
import { MerchantCarousel } from '@/components/home/MerchantCarousel';
import { YScreen } from '@/components/ui/YScreen';
import { buildDiscoveryContext, buildHomeSections, usePreferences } from '@/features/discovery';
import { CategoryMegaMenu } from '@/features/discovery/components/CategoryMegaMenu';
import { useMerchants, useMerchantSearchStore } from '@/features/merchants';

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

export default function HomeScreen() {
  const router = useRouter();
  const { data } = useMerchants();
  const merchants = useMemo(() => data ?? [], [data]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const userLocation = useMerchantSearchStore((s) => s.userLocation);
  const setSearch = useMerchantSearchStore((s) => s.setSearch);
  const setActiveCategory = useMerchantSearchStore((s) => s.setActiveCategory);
  const preferences = usePreferences();
  const discoveryContext = useMemo(
    () => buildDiscoveryContext({ userLocation, preferences }),
    [userLocation, preferences],
  );

  // Ranking éditorial des sections d'accueil (ordre uniquement) : priorise vraies photos +
  // catégories attractives, déprioris élevages/toilettage/pompes funèbres/services techniques
  // /sans-photo. « Recommandés » garde la pertinence du Discovery Engine comme base.
  const sections = useMemo(
    () =>
      buildHomeSections(merchants, {
        context: discoveryContext,
        limits: { recommendedToday: 8, nearbyProducers: 8, toDiscover: 8 },
      }),
    [merchants, discoveryContext],
  );

  return (
    <YScreen scroll gap="lg" padding="lg" onScroll={scrollHandler}>
      <HomeHero greeting={greetingForNow()} scrollY={scrollY} />

      {/* Méga-menu de découverte : MÊME système que /merchants (barre de cryptogrammes +
          config partagées). Sous-catégorie → recherche injectée ; catégorie → filtre partagé
          (activeCategory du store, consommé par /merchants) ; carte → écran Carte. */}
      <CategoryMegaMenu
        onSelectSubcategory={(category, subcategory) => {
          setActiveCategory(category.id);
          setSearch(subcategory.query);
          router.push('/merchants');
        }}
        onSelectCategory={(category) => {
          setSearch('');
          setActiveCategory(category.id);
          router.push('/merchants');
        }}
        onViewMap={() => router.push('/explore')}
      />

      <MerchantCarousel
        title="Recommandés aujourd'hui"
        subtitle="Les mieux notés près de vous"
        merchants={sections.recommendedToday}
        delay={60}
      />
      <MerchantCarousel
        title="Producteurs proches"
        subtitle="Circuit court & vente directe"
        merchants={sections.nearbyProducers}
        delay={120}
      />
      <MerchantCarousel
        title="À découvrir"
        subtitle="Une sélection à explorer"
        merchants={sections.toDiscover}
        delay={180}
      />
    </YScreen>
  );
}
