import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { glass } from '@/design/tokens/glass';
import { shadows } from '@/design/tokens/shadows';

const SIZE = 52;

/**
 * Bouton FAVORIS — cœur en verre (même empreinte que l'ex-avatar), teinte NEUTRE, sans compteur.
 * `onPress` ouvre les favoris. Réutilisable dans le `trailing` du SearchMenu.
 */
export function FavoritesButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Favoris"
      style={({ pressed }) => [styles.btn, glass.panel, shadows.sm, pressed && styles.pressed]}>
      <Feather name="heart" size={22} color={glass.onDark} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
