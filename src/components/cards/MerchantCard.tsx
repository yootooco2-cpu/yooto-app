import { Pressable, StyleSheet, View } from 'react-native';

import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YCard } from '@/components/ui/YCard';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, getMerchantCoverPhoto, type Merchant } from '@/features/merchants';

type Props = {
  merchant: Merchant;
  selected?: boolean;
  onPress?: () => void;
};

const THUMB_SIZE = 96;

export function MerchantCard({ merchant, selected = false, onPress }: Props) {
  // Distance si connue (≠ « — »), sinon la ville.
  const hasDistance = merchant.distanceLabel !== '—' && merchant.distanceLabel.length > 0;
  const place = hasDistance ? merchant.distanceLabel : merchant.city;

  const meta = [CATEGORY_LABELS[merchant.category]];
  if (place) meta.push(place);
  if (typeof merchant.rating === 'number') meta.push(`★ ${merchant.rating.toFixed(1)}`);

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <YCard
        variant={selected ? 'surface' : 'outline'}
        elevation={selected ? 'sm' : 'none'}
        padding="md">
        <View style={styles.row}>
          <View style={styles.thumb}>
            <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={THUMB_SIZE} rounded={radii.md} />
          </View>

          <View style={styles.info}>
            <YText variant="subtitle" numberOfLines={1}>
              {merchant.name}
            </YText>

            <YText variant="caption" color="muted" numberOfLines={1}>
              {meta.join(' · ')}
            </YText>

            {merchant.description ? (
              <YText variant="caption" color="muted" numberOfLines={2}>
                {merchant.description}
              </YText>
            ) : null}

            {merchant.isOpenNow ? (
              <View style={styles.openBadge}>
                <YText variant="caption" color="primary">
                  Ouvert
                </YText>
              </View>
            ) : null}
          </View>
        </View>
      </YCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    width: THUMB_SIZE,
  },
  info: {
    flex: 1,
    gap: spacing.xs,
  },
  openBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
});
