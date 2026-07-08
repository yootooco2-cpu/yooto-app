import { useMemo, useState } from 'react';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { MerchantCarousel } from '@/components/home/MerchantCarousel';
import { ProfileAvatarButton } from '@/components/profile/ProfileAvatarButton';
import { SectionScreen } from '@/components/theme/SectionScreen';
import { SupportContactFooter } from '@/components/ui/SupportContactFooter';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { buildDiscoveryContext, buildHomeSections, usePreferences } from '@/features/discovery';
import { SearchMenu, useMerchants, useMerchantSearchStore, type MerchantPredicate } from '@/features/merchants';

export default function HomeScreen() {
  const { data } = useMerchants();
  const merchants = useMemo(() => data ?? [], [data]);

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
        limits: { recommendedToday: 8, nearbyProducers: 8, toDiscover: 8 },
      }),
    [merchants, discoveryContext],
  );

  // MENU OFFICIEL PARTAGÉ (identique à Carte & Commerçants) : recherche + catégories filtrent
  // l'Accueil EN PLACE. Sans filtre → sections éditoriales ; avec filtre → carrousel « Résultats ».
  const [query, setQuery] = useState('');
  const [categoryMatch, setCategoryMatch] = useState<MerchantPredicate | null>(null);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = merchants;
    if (categoryMatch) list = list.filter(categoryMatch);
    if (q) list = list.filter((m) => `${m.name} ${m.description}`.toLowerCase().includes(q));
    return list;
  }, [merchants, categoryMatch, q]);
  const filtering = q.length > 0 || categoryMatch !== null;

  // Accueil ÉPURÉ, orienté action : on conserve le FOND D'AMBIANCE image de l'univers (discret,
  // blur + voile) mais SANS aucun texte héro par-dessus. La page démarre directement par la
  // recherche → catégories → recommandations.
  return (
    <SectionScreen section="accueil" scrollY={scrollY} height={440}>
      <YScreen transparent scroll gap="lg" padding="lg" onScroll={scrollHandler}>
        {/* PREMIER élément fort : le MENU OFFICIEL PARTAGÉ (recherche + catégories + profil). */}
        <SearchMenu
          query={query}
          onQueryChange={setQuery}
          onCategoryChange={(m) => setCategoryMatch(() => m)}
          trailing={<ProfileAvatarButton />}
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
          </>
        )}
        <SupportContactFooter />
      </YScreen>
    </SectionScreen>
  );
}
