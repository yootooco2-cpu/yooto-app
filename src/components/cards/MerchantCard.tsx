import { Pressable, StyleSheet, View } from 'react-native';

import { Cryptogram } from '@/components/merchants/Cryptogram';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { getMerchantCoverPhoto, type Merchant } from '@/features/merchants';
import { cryptogramColor, cryptogramForMerchant } from '@/features/merchants/cryptograms';

type Props = {
  merchant: Merchant;
  selected?: boolean;
  onPress?: () => void;
};

const IMAGE_HEIGHT = 168;

/** Carte commerce style Airbnb : image valorisée, badge catégorie, hiérarchie aérée. */
export function MerchantCard({ merchant, selected = false, onPress }: Props) {
  const hasDistance = merchant.distanceLabel !== '—' && merchant.distanceLabel.length > 0;
  const place = hasDistance ? merchant.distanceLabel : merchant.city;
  const cryptoId = cryptogramForMerchant(merchant);
  const ringColor = cryptogramColor(cryptoId);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}>
      <View style={styles.imageWrap}>
        <MerchantPhoto
          uri={getMerchantCoverPhoto(merchant)}
          height={IMAGE_HEIGHT}
          rounded={0}
          recyclingKey={merchant.id}
        />
        {/* Contour catégorie (overlay, ne change pas la taille de la photo). */}
        <View style={[styles.ring, { borderColor: ringColor }]} pointerEvents="none" />
        {/* Cryptogramme officiel en haut à droite. */}
        <View style={styles.cryptogram} pointerEvents="none">
          <Cryptogram id={cryptoId} size={34} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <YText variant="subtitle" numberOfLines={1} style={styles.title}>
            {merchant.name}
          </YText>
          {typeof merchant.rating === 'number' ? (
            <YText variant="caption" color="default">
              ★ {merchant.rating.toFixed(1)}
            </YText>
          ) : null}
        </View>

        {place || merchant.isOpenNow ? (
          <View style={styles.metaRow}>
            {place ? (
              <YText variant="caption" color="muted">
                {place}
              </YText>
            ) : null}
            {merchant.isOpenNow ? (
              <YText variant="caption" color="primary">
                {place ? '· Ouvert' : 'Ouvert'}
              </YText>
            ) : null}
          </View>
        ) : null}

        {merchant.description ? (
          <YText variant="caption" color="muted" numberOfLines={1}>
            {merchant.description}
          </YText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  selected: {
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.96,
    transform: [{ scale: 0.985 }],
  },
  imageWrap: {
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  cryptogram: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    ...shadows.sm,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
