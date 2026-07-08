import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { MerchantCard } from '@/components/cards/MerchantCard';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { spacing } from '@/design/tokens/spacing';
import type { Merchant } from '@/features/merchants';

type Props = {
  title: string;
  subtitle?: string;
  merchants: Merchant[];
  /** Décalage d'apparition (effet éditorial échelonné). */
  delay?: number;
};

const CARD_WIDTH = 260;
/** Espace horizontal entre cartes — respiration premium (Apple/Airbnb/Spotify). N'affecte QUE
 *  l'écart entre deux cartes : largeur/hauteur des cartes, marges du carrousel et peek inchangés. */
const CARD_GAP = 32;

/** Section d'accueil : titre + carrousel horizontal de cartes commerce premium. */
export function MerchantCarousel({ title, subtitle, merchants, delay = 0 }: Props) {
  const router = useRouter();
  if (merchants.length === 0) return null;

  return (
    <View style={styles.section}>
      {/* Hiérarchie renforcée : titre plus grand/gras, sous-titre volontairement plus discret. */}
      <Animated.View entering={FadeIn.delay(delay).duration(260)} style={styles.header}>
        <YText variant="subtitle" style={styles.title}>
          {title}
        </YText>
        {subtitle ? (
          <YText variant="caption" style={styles.subtitle}>
            {subtitle}
          </YText>
        ) : null}
      </Animated.View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {merchants.map((merchant, i) => (
          // Apparition progressive, échelonnée carte par carte (fluide, jamais lourde).
          <Animated.View
            key={merchant.id}
            entering={FadeInDown.delay(delay + i * 55).duration(300)}
            style={styles.card}>
            <MerchantCard
              merchant={merchant}
              onPress={() =>
                router.push({ pathname: '/merchant/[id]', params: { id: merchant.id } })
              }
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    // Plus d'air AU-DESSUS de chaque section (hiérarchie) + respiration verticale.
    marginTop: spacing.md,
    gap: spacing.md - 4,
  },
  header: {
    gap: 3,
  },
  // Titre de section : légèrement plus grand et plus gras → repérage immédiat.
  title: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  // Sous-titre conservé mais hiérarchie plus discrète (teinte atténuée de la DA).
  subtitle: {
    color: glass.onDarkMuted,
  },
  row: {
    gap: CARD_GAP,
    paddingRight: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
  },
});
