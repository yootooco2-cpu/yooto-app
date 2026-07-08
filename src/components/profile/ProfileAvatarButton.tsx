import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { shadows } from '@/design/tokens/shadows';
import { useProfileRow, useSession } from '@/features/auth';

/** Anneau noir mat de l'avatar — identité personnelle, cohérente dans toute l'application. */
const RING = '#0E1310';

/** Initiale d'affichage (prénom ou email) pour le repli sans photo. */
function initialOf(name: string | null, email: string | null): string {
  const src = (name ?? email ?? '').trim();
  return src ? src.charAt(0).toUpperCase() : '?';
}

/**
 * Bouton AVATAR de profil — identité personnelle RÉUTILISÉE partout : photo (ou initiale), ANNEAU
 * NOIR MAT, pastille verte « en ligne » quand connecté, ombre très légère. Tap → écran Profil.
 * `size` permet de l'adapter (56 par défaut ; 48 dans l'en-tête du Chat) sans dupliquer le composant.
 */
export function ProfileAvatarButton({ size = 56 }: { size?: number }) {
  const router = useRouter();
  const { status, userId, identity } = useSession();
  const isAuthenticated = status === 'authenticated';
  const profileRow = useProfileRow(isAuthenticated ? userId : null);
  const avatarUrl = isAuthenticated ? profileRow.avatarUrl ?? identity?.avatarUrl : null;
  const initial = initialOf(profileRow.displayName ?? identity?.displayName ?? null, identity?.email ?? profileRow.email);

  const dot = Math.round(size * 0.3);
  const dotBorder = Math.max(2, Math.round(size * 0.055));

  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel={isAuthenticated ? 'Mon profil' : 'Se connecter'}
      style={({ pressed }) => [{ width: size, height: size }, shadows.sm, pressed && styles.pressed]}>
      {/* Fond en verre + ANNEAU NOIR MAT (l'anneau prime sur la bordure du verre). */}
      <View style={[styles.avatar, glass.panel, styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
        {avatarUrl ? (
          <Image source={avatarUrl} style={styles.img} contentFit="cover" recyclingKey={avatarUrl} />
        ) : isAuthenticated ? (
          <YText style={[styles.initial, { fontSize: size * 0.4, color: glass.onDark }]}>{initial}</YText>
        ) : (
          <Feather name="user" size={size * 0.43} color={glass.onDark} />
        )}
      </View>
      {isAuthenticated ? (
        <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot / 2, borderWidth: dotBorder }]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  avatar: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 2, borderColor: RING },
  img: { width: '100%', height: '100%' },
  initial: { fontWeight: '800' },
  // Pastille de présence « en ligne » : vert connecté, bord mat pour se détacher de la photo.
  dot: { position: 'absolute', right: -1, bottom: -1, backgroundColor: '#69B96C', borderColor: RING },
});
