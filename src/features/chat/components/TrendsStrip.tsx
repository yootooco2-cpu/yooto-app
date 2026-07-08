import { ScrollView, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import type { Trend } from '../types';

/** « Tendance près de chez vous » — bloc COMPACT en tête du fil : donne le pouls du territoire et
 *  l'envie de descendre. Défilement horizontal de petites cartes. */
export function TrendsStrip({ trends }: { trends: Trend[] }) {
  const { colors } = useTheme();
  if (trends.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <YText style={styles.headEmoji}>🔥</YText>
        <YText style={[styles.title, { color: glass.onDark }]}>Tendance près de chez vous</YText>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {trends.map((t) => (
          <View key={t.id} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <YText style={styles.emoji}>{t.emoji}</YText>
            <YText variant="caption" numberOfLines={3} style={[styles.label, { color: colors.text }]}>{t.label}</YText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.xs },
  headEmoji: { fontSize: 14 },
  title: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  row: { gap: spacing.sm, paddingRight: spacing.sm },
  chip: { width: 172, gap: 6, padding: spacing.sm + 2, borderRadius: radii.lg, borderWidth: 1 },
  emoji: { fontSize: 20 },
  label: { fontWeight: '600', lineHeight: 17 },
});
