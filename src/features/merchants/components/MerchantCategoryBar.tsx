import { Image } from 'expo-image';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { cryptogramColor } from '../cryptograms';
import { cryptogramAsset } from '../cryptogramAssets';
import {
  MERCHANT_CATEGORY_FILTERS,
  type MerchantCategoryId,
} from '../merchantCategoryFilters';

const IS_WEB = Platform.OS === 'web';

interface Props {
  active: MerchantCategoryId | null;
  onToggle: (id: MerchantCategoryId) => void;
  /** Web : survol d'une catégorie (ouvre le panneau de découverte sur l'Accueil). */
  onHover?: (id: MerchantCategoryId) => void;
}

/**
 * MerchantCategoryBar — rangée horizontale de catégories PARTAGÉE (Accueil + Commerçants).
 * Pastilles pictogramme (cryptogramme officiel) + label. Tap = sélection/désélection ;
 * survol web (optionnel) = ouverture immédiate. Purement présentationnel : ne remonte que
 * l'id (le filtrage/panneau vit dans l'écran consommateur). Source unique de la DA.
 */
export function MerchantCategoryBar({ active, onToggle, onHover }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}>
      {MERCHANT_CATEGORY_FILTERS.map((cat) => {
        const isActive = cat.id === active;
        const color = cryptogramColor(cat.icon);
        return (
          <Pressable
            key={cat.id}
            onPress={() => onToggle(cat.id)}
            onHoverIn={IS_WEB && onHover ? () => onHover(cat.id) : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={cat.label}
            style={[styles.chip, isActive && { borderColor: color, backgroundColor: `${color}18` }]}>
            <Image source={cryptogramAsset(cat.icon)} style={styles.icon} contentFit="contain" />
            <YText variant="caption" style={[styles.label, isActive ? { color } : null]}>
              {cat.label}
            </YText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 26,
    height: 26,
  },
  label: {
    color: colors.text,
  },
});
