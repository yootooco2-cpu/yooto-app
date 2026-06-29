import { Pressable, StyleSheet, View } from 'react-native';

import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YCard } from '@/components/ui/YCard';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import {
  CATEGORY_LABELS,
  getMerchantCoverPhoto,
  getMerchantTags,
  type Merchant,
} from '@/features/merchants';

type Props = {
  merchant: Merchant;
  selected?: boolean;
  onPress?: () => void;
};

export function MerchantCard({ merchant, selected = false, onPress }: Props) {
  const tags = getMerchantTags(merchant);

  // Distance si connue (≠ « — »), sinon la ville.
  const hasDistance = merchant.distanceLabel !== '—' && merchant.distanceLabel.length > 0;
  const rightLabel = hasDistance ? merchant.distanceLabel : (merchant.city ?? '');

  const meta = [CATEGORY_LABELS[merchant.category]];
  if (typeof merchant.rating === 'number') meta.push(`★ ${merchant.rating.toFixed(1)}`);
  if (typeof merchant.ecoScore === 'number') meta.push(`Éco ${merchant.ecoScore}`);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <YCard variant={selected ? 'surface' : 'outline'} elevation={selected ? 'sm' : 'none'}>
        <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={120} />

        <View style={styles.header}>
          <YText variant="subtitle" style={styles.title}>
            {merchant.name}
          </YText>
          {rightLabel ? (
            <YText variant="caption" color="primary">
              {rightLabel}
            </YText>
          ) : null}
        </View>

        <YText variant="caption" color="muted">
          {meta.join(' · ')}
        </YText>

        {merchant.description ? (
          <YText variant="body" color="muted">
            {merchant.description}
          </YText>
        ) : null}

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
