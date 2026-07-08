import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { shadows } from '@/design/tokens/shadows';
import { useFavoriteIds } from '@/features/favorites';

const SIZE = 52;

/**
 * Bouton FAVORIS — cœur en verre (même empreinte que l'ex-avatar), teinte NEUTRE, avec pastille
 * de compteur discrète. Réutilisable dans le `trailing` du SearchMenu. `onPress` ouvre les favoris.
 */
export function FavoritesButton({ onPress }: { onPress: () => void }) {
  const count = useFavoriteIds().length;
  const active = count > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={active ? `Favoris (${count})` : 'Favoris'}
      style={({ pressed }) => [styles.btn, glass.panel, shadows.sm, pressed && styles.pressed]}>
      <Feather name="heart" size={22} color={glass.onDark} />
      {active ? (
        <View style={styles.badge}>
          <YText style={styles.badgeText}>{count}</YText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  badge: {
    position: 'absolute',
    top: -1,
    right: -1,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.onDark,
    borderWidth: 2,
    borderColor: '#111714',
  },
  badgeText: { color: '#111714', fontSize: 11, fontWeight: '800' },
});
