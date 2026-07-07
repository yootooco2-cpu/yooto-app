import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { AuthSheet } from '@/components/auth/AuthSheet';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/design/theme/ThemeProvider';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { useSession } from '@/features/auth';
import { useFavoritesStore, useIsFavorite } from '@/features/favorites';
import { haptics } from '@/lib/haptics';
import { FavoritesService } from '@/services/FavoritesService';

const FAV_COLOR = '#D9645A';

/**
 * Bouton FAVORI réutilisable (fiche commerce). Cœur contour → plein, pastille circulaire
 * translucide. Ajoute/retire des favoris : optimiste (store partagé → compteur profil + « Mes
 * favoris »), persisté via `FavoritesService` (Supabase), avec haptique + toast + ROLLBACK si
 * échec, anti double-tap et loader discret. Non connecté → ouvre la feuille de connexion.
 * Aucun accès Supabase direct : tout passe par les services / le store.
 */
export function FavoriteHeartButton({ merchantId, style }: { merchantId: string; style?: ViewStyle }) {
  const { colors } = useTheme();
  const saved = useIsFavorite(merchantId);
  const setFavoriteLocal = useFavoritesStore((s) => s.setFavoriteLocal);
  const { status } = useSession();
  const toast = useToast();
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const onToggle = async () => {
    if (busy) return;
    if (status !== 'authenticated') {
      haptics.light();
      setAuthOpen(true);
      return;
    }
    const willBeFav = !saved;
    setBusy(true);
    haptics.light();
    setFavoriteLocal(merchantId, willBeFav); // optimiste (UI + compteur + liste)

    const ok = await FavoritesService.setFavorite(merchantId, willBeFav);
    if (!ok) {
      setFavoriteLocal(merchantId, !willBeFav); // rollback
      haptics.error();
      toast.show('Action impossible, réessayez', 'error');
    } else {
      toast.show(willBeFav ? 'Ajouté aux favoris' : 'Retiré des favoris', 'success');
    }
    setBusy(false);
  };

  return (
    <>
      <Pressable
        onPress={() => void onToggle()}
        accessibilityRole="button"
        accessibilityState={{ selected: saved, busy }}
        accessibilityLabel={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        hitSlop={8}
        style={({ pressed }) => [styles.fav, { borderColor: colors.border }, style, pressed && styles.pressed]}>
        {busy ? (
          <ActivityIndicator size="small" color={FAV_COLOR} />
        ) : (
          <Animated.View key={saved ? 'on' : 'off'} entering={saved ? ZoomIn.duration(200) : undefined}>
            <MaterialCommunityIcons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? FAV_COLOR : '#F4F1E8'} />
          </Animated.View>
        )}
      </Pressable>
      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  fav: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Verre sombre premium (scrim sur la photo) — jamais de pastille blanche.
    backgroundColor: 'rgba(7,17,11,0.55)',
    borderWidth: 1,
    ...shadows.sm,
  },
  pressed: { opacity: 0.85 },
});
