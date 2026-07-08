import { Pressable, StyleSheet, View } from 'react-native';

import { Cryptogram } from '@/components/merchants/Cryptogram';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
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

const IMAGE_HEIGHT = 172;

/**
 * Carte commerce SIGNATURE YOOTOO : photo valorisée, pictogramme cryptogramme dans une pastille
 * givrée (intégration douce), fine BARRE d'accent à la couleur de la famille (repère de marque),
 * puis une hiérarchie aérée nom / note / lieu / description. Pensée pour être reconnaissable au
 * premier coup d'œil comme une carte YOOTOO — pas une carte générique.
 */
export function MerchantCard({ merchant, selected = false, onPress }: Props) {
  const { colors } = useTheme();
  const hasDistance = merchant.distanceLabel !== '—' && merchant.distanceLabel.length > 0;
  const place = hasDistance ? merchant.distanceLabel : merchant.city;
  const cryptoId = cryptogramForMerchant(merchant);
  const accent = cryptogramColor(cryptoId);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.imageWrap}>
        <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={IMAGE_HEIGHT} rounded={0} recyclingKey={merchant.id} />

        {/* Pictogramme de famille dans une pastille givrée sombre → intégré, jamais posé « dessus ». */}
        <View style={styles.cryptoBadge} pointerEvents="none">
          <Cryptogram id={cryptoId} size={28} />
        </View>

        {/* Barre d'accent de la FAMILLE : signature YOOTOO discrète à la couture image / contenu. */}
        <View style={[styles.accentBar, { backgroundColor: accent }]} pointerEvents="none" />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <YText variant="subtitle" numberOfLines={1} style={styles.title}>
            {merchant.name}
          </YText>
          {typeof merchant.rating === 'number' ? (
            <View style={[styles.ratingPill, { backgroundColor: colors.surfaceAlt }]}>
              <YText style={[styles.ratingStar, { color: colors.accent }]}>★</YText>
              <YText style={[styles.ratingVal, { color: colors.text }]}>{merchant.rating.toFixed(1)}</YText>
            </View>
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
          <YText variant="caption" color="muted" numberOfLines={1} style={styles.description}>
            {merchant.description}
          </YText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadows.sm,
  },
  pressed: {
    opacity: 0.97,
    transform: [{ scale: 0.97 }],
  },
  imageWrap: {
    position: 'relative',
  },
  cryptoBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(12,16,13,0.52)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    ...shadows.sm,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md - 2,
    paddingBottom: spacing.md,
    gap: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  ratingStar: {
    fontSize: 12,
  },
  ratingVal: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  description: {
    opacity: 0.92,
  },
});
