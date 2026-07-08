import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

const IMAGE_HEIGHT = 172;

/** Skeleton à la forme EXACTE d'une MerchantCard (photo + nom + méta + description). */
export function MerchantCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Skeleton width="100%" height={IMAGE_HEIGHT} radius={0} />
      <View style={styles.body}>
        <Skeleton width="70%" height={15} />
        <Skeleton width="45%" height={12} />
        <Skeleton width="88%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, ...shadows.sm },
  body: { padding: spacing.md, gap: 9 },
});
