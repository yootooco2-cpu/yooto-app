import { Pressable, StyleSheet, View } from 'react-native';

import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, getMerchantCoverPhoto, type Merchant } from '@/features/merchants';

interface Props {
  merchant: Merchant;
  onPress: () => void;
  /** `true` = rendu sur fond sombre (bottom sheet en verre dépoli) → textes clairs. */
  onDark?: boolean;
}

/** Ligne de liste commerce (réutilisable) avec feedback au tap. */
export function MerchantListRow({ merchant, onPress, onDark = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={merchant.name}
      style={({ pressed }) => [styles.row, pressed && (onDark ? styles.pressedDark : styles.pressed)]}>
      <View style={styles.thumb}>
        <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={56} rounded={radii.md} />
      </View>
      <View style={styles.text}>
        <YText variant="bodyStrong" numberOfLines={1} style={onDark ? { color: glass.onDark } : undefined}>
          {merchant.name}
        </YText>
        <YText
          variant="caption"
          color="muted"
          numberOfLines={1}
          style={onDark ? { color: glass.onDarkMuted } : undefined}>
          {[CATEGORY_LABELS[merchant.category], merchant.city].filter(Boolean).join(' · ')}
        </YText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
  },
  pressed: {
    backgroundColor: 'rgba(31,122,77,0.06)',
  },
  pressedDark: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  thumb: {
    width: 56,
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
