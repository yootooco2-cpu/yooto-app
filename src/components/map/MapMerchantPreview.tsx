import { Feather } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FavoriteHeartButton } from '@/components/favorites/FavoriteHeartButton';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, getMerchantCoverPhoto, type Merchant } from '@/features/merchants';
import { buildDirectionsUrl } from '@/features/merchants/directions';
import { formatRatingFr, starFill } from '@/features/merchants/reviews';

type FeatherName = ComponentProps<typeof Feather>['name'];

const openUrl = (url?: string) => {
  if (url) void Linking.openURL(url).catch(() => {});
};

type Props = {
  merchant: Merchant;
  onPress: () => void;
  onClose: () => void;
  /** Aplati (sans bord/ombre/fond) quand rendu DANS le bottom sheet — surface unique. */
  flat?: boolean;
};

/** Action compacte icône + label (Itinéraire / Appeler / Site web). */
function CompactAction({ icon, label, onPress }: { icon: FeatherName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Feather name={icon} size={15} color={colors.primary} />
      <YText variant="caption" color="primary" numberOfLines={1}>
        {label}
      </YText>
    </Pressable>
  );
}

/**
 * Mini-fiche du commerce sélectionné, affichée dans le bottom sheet de la carte.
 * Bouton FAVORI en overlay sur la photo (haut-droite) via `FavoriteHeartButton`. Le commerce
 * reste le héros ; le favori ne concurrence pas les CTA (Itinéraire / Appeler / Site web).
 */
export function MapMerchantPreview({ merchant, onPress, onClose, flat = false }: Props) {
  const categoryLine = [CATEGORY_LABELS[merchant.category], merchant.city].filter(Boolean).join(' • ');
  const stars = ((): string => {
    if (typeof merchant.rating !== 'number') return '';
    const { full, empty } = starFill(merchant.rating);
    return '★'.repeat(full) + '☆'.repeat(empty);
  })();

  return (
    <Animated.View style={[styles.card, flat && styles.cardFlat]} entering={FadeInDown.duration(220)}>
      <View style={styles.photoWrap}>
        <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={130} rounded={radii.lg} recyclingKey={merchant.id} />

        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} hitSlop={8} style={styles.close}>
          <Feather name="x" size={16} color={colors.text} />
        </Pressable>

        <FavoriteHeartButton merchantId={merchant.id} />
      </View>

      <YText variant="subtitle" numberOfLines={1}>
        {merchant.name}
      </YText>

      <View style={styles.categoryRow}>
        {categoryLine ? (
          <YText variant="caption" color="muted" numberOfLines={1} style={styles.categoryLine}>
            {categoryLine}
          </YText>
        ) : null}
        <View style={styles.localPill}>
          <YText variant="caption" color="primary">
            Local
          </YText>
        </View>
        {merchant.isOpenNow ? (
          <YText variant="caption" color="primary" style={styles.status}>
            ● Ouvert
          </YText>
        ) : (
          <YText variant="caption" color="muted" style={styles.status}>
            ● Fermé
          </YText>
        )}
      </View>

      {typeof merchant.rating === 'number' ? (
        <View style={styles.ratingLine}>
          <YText variant="caption" color="accent" style={styles.stars}>
            {stars}
          </YText>
          <YText variant="caption" style={styles.ratingScore}>
            {formatRatingFr(merchant.rating)}
          </YText>
          {typeof merchant.reviewCount === 'number' ? (
            <YText variant="caption" color="muted" style={styles.reviewCount}>
              · {merchant.reviewCount} avis
            </YText>
          ) : null}
        </View>
      ) : null}

      {merchant.description ? (
        <YText variant="caption" color="muted" numberOfLines={2}>
          {merchant.description}
        </YText>
      ) : null}

      <View style={styles.actionsRow}>
        <CompactAction icon="navigation" label="Itinéraire" onPress={() => openUrl(buildDirectionsUrl(merchant))} />
        {merchant.phone ? <CompactAction icon="phone" label="Appeler" onPress={() => openUrl(`tel:${merchant.phone}`)} /> : null}
        {merchant.website ? <CompactAction icon="globe" label="Site web" onPress={() => openUrl(merchant.website)} /> : null}
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
  cardFlat: { backgroundColor: 'transparent', borderWidth: 0, padding: 0, shadowOpacity: 0, elevation: 0 },
  photoWrap: { position: 'relative' },
  close: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...shadows.sm,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  categoryLine: { flexShrink: 1 },
  localPill: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(31,122,77,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(31,122,77,0.25)',
  },
  status: { fontWeight: '600' },
  ratingLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  stars: { letterSpacing: 1 },
  ratingScore: { color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] },
  reviewCount: { fontVariant: ['tabular-nums'] },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.85 },
});
