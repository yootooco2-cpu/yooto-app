import { Feather } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { FavoriteHeartButton } from '@/components/favorites/FavoriteHeartButton';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { CATEGORY_LABELS, getMerchantCoverPhoto, type Merchant } from '@/features/merchants';
import { buildDirectionsUrl } from '@/features/merchants/directions';
import { shareMerchant } from '@/features/merchants/share';

type FeatherName = ComponentProps<typeof Feather>['name'];

const ACCENT = '#8FC079'; // vert clair lisible sur fond sombre (actions)
const OPEN = '#7FD79A';
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

/** Action de la barre inférieure (icône verte + label), désactivable proprement. */
function ActionItem({ icon, label, onPress, disabled }: { icon: FeatherName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, pressed && styles.pressed, disabled && styles.actionDisabled]}>
      <Feather name={icon} size={19} color={ACCENT} />
      <YText variant="caption" style={[styles.actionLabel, { color: ACCENT }]} numberOfLines={1}>
        {label}
      </YText>
    </Pressable>
  );
}

/**
 * Mini-fiche du commerce sélectionné (bottom sheet de la carte) — DA sombre premium (verre dépoli).
 * Photo (cœur en overlay) + identité (nom, badge PRODUCTEUR, note · distance, description, statut)
 * + barre d'actions (Itinéraire / Appeler / Site web / Partager). Le commerce reste le héros.
 */
export function MapMerchantPreview({ merchant, onPress, onClose, flat = false }: Props) {
  const categoryLine = [CATEGORY_LABELS[merchant.category], merchant.city].filter(Boolean).join(' • ');
  const hasDistance = merchant.distanceLabel !== '—' && merchant.distanceLabel.length > 0;

  return (
    <Animated.View style={[styles.card, flat ? styles.cardFlat : styles.cardDark]} entering={FadeInDown.duration(220)}>
      <View style={styles.body}>
        <Pressable onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={`Voir ${merchant.name}`} style={styles.photoWrap}>
          <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={168} rounded={radii.lg} recyclingKey={merchant.id} />
          <FavoriteHeartButton merchantId={merchant.id} />
        </Pressable>

        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={merchant.name} style={styles.info}>
          <YText style={styles.name} numberOfLines={2}>
            {merchant.name}
          </YText>

          {merchant.isProducer ? (
            <View style={styles.badge}>
              <YText style={styles.badgeText}>PRODUCTEUR</YText>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            {typeof merchant.rating === 'number' ? (
              <View style={styles.metaItem}>
                <Feather name="star" size={13} color={STAR} />
                <YText style={styles.metaText}>
                  {merchant.rating.toFixed(1)}
                  {typeof merchant.reviewCount === 'number' ? ` (${merchant.reviewCount})` : ''}
                </YText>
              </View>
            ) : null}
            {hasDistance ? (
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={13} color={glass.onDarkMuted} />
                <YText style={styles.metaText}>{merchant.distanceLabel}</YText>
              </View>
            ) : null}
          </View>

          {merchant.description ? (
            <YText style={styles.desc} numberOfLines={2}>
              {merchant.description}
            </YText>
          ) : categoryLine ? (
            <YText style={styles.desc} numberOfLines={1}>
              {categoryLine}
            </YText>
          ) : null}

          <View style={styles.statusBox}>
            <View style={[styles.statusDot, { backgroundColor: merchant.isOpenNow ? OPEN : glass.onDarkMuted }]} />
            <YText style={[styles.statusText, { color: merchant.isOpenNow ? OPEN : glass.onDarkMuted }]}>
              {merchant.isOpenNow ? 'Ouvert' : 'Fermé'}
            </YText>
          </View>
        </Pressable>

        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fermer" style={styles.close}>
          <Feather name="x" size={16} color={glass.onDark} />
        </Pressable>
      </View>

      <View style={styles.actionsBar}>
        <ActionItem icon="navigation" label="Itinéraire" onPress={() => openUrl(buildDirectionsUrl(merchant))} />
        <ActionItem icon="phone" label="Appeler" disabled={!merchant.phone} onPress={() => openUrl(`tel:${merchant.phone}`)} />
        <ActionItem icon="globe" label="Site web" disabled={!merchant.website} onPress={() => openUrl(merchant.website)} />
        <ActionItem icon="share-2" label="Partager" onPress={() => void shareMerchant(merchant)} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, padding: spacing.md, gap: spacing.md },
  cardDark: { backgroundColor: 'rgba(18,22,20,0.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  cardFlat: { backgroundColor: 'transparent', padding: 0 },
  body: { flexDirection: 'row', gap: spacing.md },
  photoWrap: { width: 128, height: 168, borderRadius: radii.lg, overflow: 'hidden' },
  info: { flex: 1, gap: spacing.xs },
  name: { color: glass.onDark, fontSize: 21, lineHeight: 26, fontWeight: '800', letterSpacing: -0.4 },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(143,192,121,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(143,192,121,0.45)',
  },
  badgeText: { color: ACCENT, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: glass.onDark, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  desc: { color: glass.onDarkMuted, fontSize: 13, lineHeight: 18 },
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
    borderColor: 'rgba(255,255,255,0.14)',
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12.5, fontWeight: '700' },
  close: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  actionsBar: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: spacing.sm,
  },
  action: { flex: 1, alignItems: 'center', gap: 5 },
  actionLabel: { fontWeight: '600' },
  actionDisabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
});
