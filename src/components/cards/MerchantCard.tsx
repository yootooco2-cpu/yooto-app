import { Pressable, StyleSheet, View } from 'react-native';

import { YCard } from '@/components/ui/YCard';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, getMerchantTags, type Merchant } from '@/features/merchants';

type Props = {
  merchant: Merchant;
  selected?: boolean;
  onPress?: () => void;
};

export function MerchantCard({ merchant, selected = false, onPress }: Props) {
  const tags = getMerchantTags(merchant);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <YCard variant={selected ? 'surface' : 'outline'} elevation={selected ? 'sm' : 'none'}>
        <View style={styles.header}>
          <YText variant="subtitle" style={styles.title}>
            {merchant.name}
          </YText>
          <YText variant="caption" color="primary">
            {merchant.distanceLabel}
          </YText>
        </View>

        <YText variant="caption" color="muted">
          {CATEGORY_LABELS[merchant.category]} · Éco {merchant.ecoScore}
        </YText>

        <YText variant="body" color="muted">
          {merchant.description}
        </YText>

        {tags.length > 0 ? (
          <YText variant="caption" color="accent">
            {tags.join(' · ')}
          </YText>
        ) : null}
      </YCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
  },
});
