import { Feather } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FavoriteHeartButton } from '@/components/favorites/FavoriteHeartButton';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { ActionButton } from '@/components/ui/ActionButton';
import { YText } from '@/components/ui/YText';
import { DarkThemeScope, useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, getMerchantCoverPhoto, type Merchant } from '@/features/merchants';
import { buildDirectionsUrl } from '@/features/merchants/directions';
import { shareMerchant } from '@/features/merchants/share';

const STAR = '#E7B84B';

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

function PreviewInner({ merchant, onPress, onClose, flat = false }: Props) {
  const { colors } = useTheme();
  const categoryLine = [CATEGORY_LABELS[merchant.category], merchant.city].filter(Boolean).join(' • ');
  const hasDistance = merchant.distanceLabel !== '—' && merchant.distanceLabel.length > 0;

  return (
    <Animated.View
      style={[styles.card, flat ? styles.cardFlat : { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
      entering={FadeInDown.duration(220)}>
      <View style={styles.body}>
        <Pressable onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={`Voir ${merchant.name}`} style={styles.photoWrap}>
          <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={172} rounded={radii.lg} recyclingKey={merchant.id} />
          <FavoriteHeartButton merchantId={merchant.id} />
        </Pressable>

        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={merchant.name} style={styles.info}>
          <YText style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {merchant.name}
          </YText>

          {merchant.isProducer ? (
            <View style={[styles.badge, { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}55` }]}>
              <YText style={[styles.badgeText, { color: colors.primary }]}>PRODUCTEUR</YText>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            {typeof merchant.rating === 'number' ? (
              <View style={styles.metaItem}>
                <Feather name="star" size={13} color={STAR} />
                <YText style={[styles.metaText, { color: colors.text }]}>
                  {merchant.rating.toFixed(1)}
                  {typeof merchant.reviewCount === 'number' ? ` (${merchant.reviewCount})` : ''}
                </YText>
              </View>
            ) : null}
            {hasDistance ? (
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={13} color={colors.mutedText} />
                <YText style={[styles.metaText, { color: colors.text }]}>{merchant.distanceLabel}</YText>
              </View>
            ) : null}
          </View>

          {merchant.description ? (
            <YText style={[styles.desc, { color: colors.mutedText }]} numberOfLines={2}>
              {merchant.description}
            </YText>
          ) : categoryLine ? (
            <YText style={[styles.desc, { color: colors.mutedText }]} numberOfLines={1}>
              {categoryLine}
            </YText>
          ) : null}

          <View style={[styles.statusBox, { borderColor: colors.border }]}>
            <View style={[styles.statusDot, { backgroundColor: merchant.isOpenNow ? colors.success : colors.mutedText }]} />
            <YText style={[styles.statusText, { color: merchant.isOpenNow ? colors.success : colors.mutedText }]}>
              {merchant.isOpenNow ? 'Ouvert' : 'Fermé'}
            </YText>
          </View>
        </Pressable>

        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer" style={[styles.close, { backgroundColor: colors.surfaceAlt }]}>
          <Feather name="x" size={16} color={colors.text} />
        </Pressable>
      </View>

      {/* Hiérarchie premium : Itinéraire = action PRINCIPALE ; les autres restent discrètes. */}
      <ActionButton icon="navigation" label="Itinéraire" variant="primary" fullWidth onPress={() => openUrl(buildDirectionsUrl(merchant))} />
      <View style={styles.secondaryRow}>
        <ActionButton icon="phone" label="Appeler" fullWidth disabled={!merchant.phone} onPress={() => openUrl(`tel:${merchant.phone}`)} />
        <ActionButton icon="globe" label="Site web" fullWidth disabled={!merchant.website} onPress={() => openUrl(merchant.website)} />
        <ActionButton icon="share-2" label="Partager" fullWidth onPress={() => void shareMerchant(merchant)} />
      </View>
    </Animated.View>
  );
}

/**
 * Mini-fiche du commerce (bottom sheet de la carte) — DA sombre premium, forcée en thème sombre
 * (DarkThemeScope) pour partager EXACTEMENT les mêmes tokens que le panneau desktop.
 */
export function MapMerchantPreview(props: Props) {
  return (
    <DarkThemeScope>
      <PreviewInner {...props} />
    </DarkThemeScope>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, padding: spacing.md, gap: spacing.sm },
  cardFlat: { backgroundColor: 'transparent', padding: 0 },
  body: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xs },
  photoWrap: { width: 128, height: 172, borderRadius: radii.lg, overflow: 'hidden' },
  info: { flex: 1, gap: spacing.xs },
  name: { fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.4 },
  badge: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: spacing.sm, borderRadius: radii.pill, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  desc: { fontSize: 13, lineHeight: 18 },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12.5, fontWeight: '700' },
  close: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm },
});
