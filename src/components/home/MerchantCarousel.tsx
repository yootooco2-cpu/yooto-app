import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MerchantCard } from '@/components/cards/MerchantCard';
import { YText } from '@/components/ui/YText';
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

/** Section d'accueil : titre + carrousel horizontal de cartes commerce premium. */
export function MerchantCarousel({ title, subtitle, merchants, delay = 0 }: Props) {
  const router = useRouter();
  if (merchants.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(220)} style={styles.section}>
      <View style={styles.header}>
        <YText variant="subtitle">{title}</YText>
        {subtitle ? (
          <YText variant="caption" color="muted">
            {subtitle}
          </YText>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {merchants.map((merchant) => (
          <View key={merchant.id} style={styles.card}>
            <MerchantCard
              merchant={merchant}
              onPress={() =>
                router.push({ pathname: '/merchant/[id]', params: { id: merchant.id } })
              }
            />
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  header: {
    gap: 2,
  },
  row: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  card: {
    width: CARD_WIDTH,
  },
});
