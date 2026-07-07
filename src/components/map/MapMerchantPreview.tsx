import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { type ComponentProps, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { AuthSheet } from '@/components/auth/AuthSheet';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { useToast } from '@/components/ui/Toast';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { useSession } from '@/features/auth';
import { useFavoritesStore, useIsFavorite } from '@/features/favorites';
import { CATEGORY_LABELS, getMerchantCoverPhoto, type Merchant } from '@/features/merchants';
import { buildDirectionsUrl } from '@/features/merchants/directions';
import { formatRatingFr, starFill } from '@/features/merchants/reviews';
import { haptics } from '@/lib/haptics';
import { FavoritesService } from '@/services/FavoritesService';

type FeatherName = ComponentProps<typeof Feather>['name'];

const FAV_COLOR = '#D9645A';

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

/** Action compacte icône + label (Itinéraire / Appeler). */
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
 * Bouton FAVORI en overlay sur la photo (haut-droite) : ajoute/retire des favoris, immédiat et
 * persisté (Supabase via FavoritesService), avec haptique + toast + rollback si échec. Non connecté
 * → invite à se connecter. Le compteur profil et « Mes favoris » (store partagé) se mettent à jour.
 */
export function MapMerchantPreview({ merchant, onPress, onClose, flat = false }: Props) {
  const saved = useIsFavorite(merchant.id);
  const setFavoriteLocal = useFavoritesStore((s) => s.setFavoriteLocal);
  const { status } = useSession();
  const toast = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const onToggleFavorite = async () => {
    if (busy) return;
    if (status !== 'authenticated') {
      haptics.light();
      setAuthOpen(true);
      return;
    }
    const willBeFav = !saved;
    setBusy(true);
    haptics.light();
    setFavoriteLocal(merchant.id, willBeFav); // optimiste (UI + compteur + liste)

    const ok = await FavoritesService.setFavorite(merchant.id, willBeFav);
    if (!ok) {
      setFavoriteLocal(merchant.id, !willBeFav); // rollback
      haptics.error();
      toast.show('Action impossible, réessayez', 'error');
    } else {
      toast.show(willBeFav ? 'Ajouté aux favoris' : 'Retiré des favoris', 'success');
    }
    setBusy(false);
  };

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

        {/* Favori — overlay haut-droite sur la photo. */}
        <Pressable
          onPress={() => void onToggleFavorite()}
          accessibilityRole="button"
          accessibilityState={{ selected: saved, busy }}
          accessibilityLabel={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          hitSlop={8}
          style={({ pressed }) => [styles.fav, pressed && styles.pressed]}>
          {busy ? (
            <ActivityIndicator size="small" color={FAV_COLOR} />
          ) : (
            <Animated.View key={saved ? 'on' : 'off'} entering={saved ? ZoomIn.duration(200) : undefined}>
              <MaterialCommunityIcons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? FAV_COLOR : colors.text} />
            </Animated.View>
          )}
        </Pressable>
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

      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
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
  fav: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.86)',
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
