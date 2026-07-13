import { Feather } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { MerchantCard } from '@/components/cards/MerchantCard';
import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { spacing } from '@/design/tokens/spacing';
import { useMerchantCardWidth } from '@/features/layout';
import type { Merchant } from '@/features/merchants';

type Props = {
  title: string;
  subtitle?: string;
  merchants: Merchant[];
  /** Route poussée par « Voir tout » (ex. `/merchants`) — absent : pas de lien. */
  seeAllHref?: Href;
  /** Décalage d'apparition (effet éditorial échelonné). */
  delay?: number;
};

// Respiration entre cartes : elles se distinguent sans se disperser (peek préservé).
const CARD_GAP = spacing.sm;

/** Section d'accueil : titre + carrousel horizontal de cartes commerce premium. */
export function MerchantCarousel({ title, subtitle, merchants, seeAllHref, delay = 0 }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  // Largeur STRICTEMENT identique à une carte de la grille Commerçants (référence unique) → même
  // impact visuel, aucune variante. Le reste (hauteur, ratio, coins, ombres, marges, typo, badges)
  // vient du composant MerchantCard partagé, donc identique par construction.
  const cardWidth = useMerchantCardWidth();
  if (merchants.length === 0) return null;

  return (
    <View style={styles.section}>
      {/* Hiérarchie renforcée : titre plus grand/gras, sous-titre volontairement plus discret. */}
      <Animated.View entering={FadeIn.delay(delay).duration(260)} style={styles.header}>
        <View style={styles.titleRow}>
          <YText variant="subtitle" style={styles.title}>
            {title}
          </YText>
          {seeAllHref ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Voir tout — ${title}`}
              onPress={() => router.push(seeAllHref)}
              hitSlop={8}
              style={({ pressed, hovered }) => [styles.seeAll, (pressed || hovered) && styles.seeAllHover]}>
              <YText variant="caption" style={[styles.seeAllLabel, { color: colors.primary }]}>
                Voir tout
              </YText>
              <Feather name="chevron-right" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
        {subtitle ? (
          <YText variant="caption" color="muted">
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
            style={{ width: cardWidth }}>
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
    // De l'air AU-DESSUS de chaque section (spacing.lg + gap d'écran) : chaque section
    // commence par une respiration — jamais d'effet liste compacte.
    marginTop: spacing.lg,
    gap: spacing.md - 4,
  },
  header: {
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  // Titre de section : légèrement plus grand et plus gras → repérage immédiat.
  title: {
    flexShrink: 1,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  // « Voir tout » : invitation discrète à explorer la section entière (onglet Commerçants).
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllHover: {
    opacity: 0.7,
  },
  seeAllLabel: {
    fontWeight: '700',
  },
  row: {
    gap: CARD_GAP,
    paddingRight: spacing.md,
  },
});
