import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, type MerchantCategory } from '@/features/merchants';

type Props = { categories: string[] };

/** Catégories favorites (Top 3) en pastilles — langage graphique commun. */
export function PreferenceCategories({ categories }: Props) {
  if (categories.length === 0) return null;

  return (
    <View>
      <YText variant="caption" color="muted">
        Catégories favorites
      </YText>
      <View style={styles.row}>
        {categories.map((category) => (
          <View key={category} style={styles.pill}>
            <YText variant="caption" color="primary">
              {CATEGORY_LABELS[category as MerchantCategory] ?? category}
            </YText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pill: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
});
