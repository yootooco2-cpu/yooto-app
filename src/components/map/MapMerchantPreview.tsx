import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, getMerchantCoverPhoto, type Merchant } from '@/features/merchants';

type Props = {
  merchant: Merchant;
  onPress: () => void;
  onClose: () => void;
  /** Aplati (sans bord/ombre/fond) quand rendu DANS le bottom sheet — surface unique. */
  flat?: boolean;
};

/** Mini-fiche du commerce sélectionné, affichée en bas de la carte. */
export function MapMerchantPreview({ merchant, onPress, onClose, flat = false }: Props) {
  const meta = [CATEGORY_LABELS[merchant.category]];
  if (merchant.city) meta.push(merchant.city);
  if (typeof merchant.rating === 'number') meta.push(`★ ${merchant.rating.toFixed(1)}`);

  return (
    <Animated.View style={[styles.card, flat && styles.cardFlat]} entering={FadeInDown.duration(220)}>
      <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={styles.close}>
        <YText variant="subtitle" color="muted">
          ✕
        </YText>
      </Pressable>

      <View style={styles.row}>
        <View style={styles.thumb}>
          <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={56} rounded={radii.md} />
        </View>
        <View style={styles.info}>
          <YText variant="subtitle" style={styles.title} numberOfLines={1}>
            {merchant.name}
          </YText>
          <View style={styles.metaRow}>
            <YText variant="caption" color="muted">
              {meta.join(' · ')}
            </YText>
            {merchant.isOpenNow ? (
              <YText variant="caption" color="primary">
                · Ouvert
              </YText>
            ) : null}
          </View>
        </View>
      </View>

      <YButton label="Voir la fiche" onPress={onPress} fullWidth />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.md,
  },
  cardFlat: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  close: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  thumb: {
    width: 56,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
