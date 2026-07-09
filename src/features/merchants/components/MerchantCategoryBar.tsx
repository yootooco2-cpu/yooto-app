import { Image } from 'expo-image';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
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
  /** `glass` = pastilles verre translucide flottant sur la carte (fusion immersive). */
  variant?: 'default' | 'glass';
}

/**
 * MerchantCategoryBar — rangée horizontale de catégories PARTAGÉE (Accueil + Commerçants).
 * Pastilles pictogramme (cryptogramme officiel) + label. Tap = sélection/désélection ;
 * survol web (optionnel) = ouverture immédiate. Purement présentationnel : ne remonte que
 * l'id (le filtrage/panneau vit dans l'écran consommateur). Source unique de la DA.
 */
export function MerchantCategoryBar({ active, onToggle, onHover, variant = 'default' }: Props) {
  const { colors } = useTheme();
  const isGlass = variant === 'glass';
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}>
      {MERCHANT_CATEGORY_FILTERS.map((cat) => {
        const isActive = cat.id === active;
        const color = cryptogramColor(cat.icon);
        // Sur la carte : inactif = verre translucide flottant ; actif = pastille verte pleine.
        const inactiveStyle = isGlass
          ? [glass.panel, styles.glassShadow]
          : { borderColor: colors.border, backgroundColor: colors.surface };
        const activeStyle = isGlass
          ? { borderColor: colors.primary, backgroundColor: colors.primary }
          : { borderColor: color, backgroundColor: `${color}1F` };
        const labelColor = isActive ? (isGlass ? glass.onDark : color) : isGlass ? glass.onDark : undefined;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onToggle(cat.id)}
            onHoverIn={IS_WEB && onHover ? () => onHover(cat.id) : undefined}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={cat.label}
            style={({ pressed }) => [
              styles.chip,
              inactiveStyle,
              isActive && activeStyle,
              pressed && styles.chipPressed,
            ]}>
            <Image source={cryptogramAsset(cat.icon)} style={styles.icon} contentFit="contain" />
            <YText variant="caption" style={[styles.label, labelColor ? { color: labelColor } : null]}>
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
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  // Ombre extrêmement douce → la pastille « flotte » au-dessus de la carte, sans arête.
  glassShadow: Platform.select({
    web: { boxShadow: '0 6px 20px rgba(0,0,0,0.22)' },
    default: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  }),
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontWeight: '600',
  },
});
