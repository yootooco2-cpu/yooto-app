import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

/** Skeleton à la forme d'une carte du fil Chat (avatar + auteur + méta + bloc contenu). */
export function ChatCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.top}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={styles.who}>
          <Skeleton width="45%" height={13} />
          <Skeleton width="62%" height={11} />
        </View>
        <Skeleton width={30} height={11} />
      </View>
      <View style={styles.body}>
        <Skeleton width={48} height={48} radius={radii.md} />
        <View style={styles.text}>
          <Skeleton width="92%" height={13} />
          <Skeleton width="68%" height={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, ...shadows.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  who: { flex: 1, gap: 6 },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 8 },
});
