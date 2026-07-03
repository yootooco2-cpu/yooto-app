import { Pressable, StyleSheet, View } from 'react-native';

import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YText } from '@/components/ui/YText';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, getMerchantCoverPhoto, type Merchant } from '@/features/merchants';

interface Props {
  merchant: Merchant;
  onPress: () => void;
}

/** Ligne de liste commerce (réutilisable) avec feedback au tap. */
export function MerchantListRow({ merchant, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={merchant.name}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.thumb}>
        <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={56} rounded={radii.md} />
      </View>
      <View style={styles.text}>
        <YText variant="bodyStrong" numberOfLines={1}>
          {merchant.name}
        </YText>
        <YText variant="caption" color="muted" numberOfLines={1}>
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
  thumb: {
    width: 56,
  },
  text: {
    flex: 1,
    gap: 1,
  },
});
