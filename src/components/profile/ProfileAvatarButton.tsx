import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { useProfileRow, useSession } from '@/features/auth';

/** Initiale d'affichage (prénom ou email) pour le repli sans photo. */
function initialOf(name: string | null, email: string | null): string {
  const src = (name ?? email ?? '').trim();
  return src ? src.charAt(0).toUpperCase() : '?';
}

/**
 * Bouton AVATAR de profil — à côté de la barre de recherche (menu partagé). Affiche la photo de
 * profil (ou l'initiale en repli) et une PASTILLE VERTE quand l'utilisateur est connecté. Tap →
 * écran Profil. Lit la session en interne : réutilisable tel quel partout où vit le menu.
 */
export function ProfileAvatarButton() {
  const router = useRouter();
  const { status, userId, identity } = useSession();
  const isAuthenticated = status === 'authenticated';
  const profileRow = useProfileRow(isAuthenticated ? userId : null);
  const avatarUrl = isAuthenticated ? profileRow.avatarUrl ?? identity?.avatarUrl : null;
  const initial = initialOf(profileRow.displayName ?? identity?.displayName ?? null, identity?.email ?? profileRow.email);

  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel={isAuthenticated ? 'Mon profil' : 'Se connecter'}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <View style={[styles.avatar, glass.panel, styles.avatarRing]}>
        {avatarUrl ? (
          <Image source={avatarUrl} style={styles.img} contentFit="cover" recyclingKey={avatarUrl} />
        ) : isAuthenticated ? (
          <YText style={[styles.initial, { color: '#FFFFFF' }]}>{initial}</YText>
        ) : (
          <Feather name="user" size={24} color="#FFFFFF" />
        )}
      </View>
      {isAuthenticated ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const SIZE = 56;
const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  avatar: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Anneau clair → l'avatar ressort davantage / gagne en luminosité sur le fond sombre.
  avatarRing: { borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.72)' },
  img: { width: '100%', height: '100%' },
  initial: { fontSize: 22, fontWeight: '800' },
  // Pastille de présence : vert connecté, bord sombre pour se détacher de la photo.
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#69B96C',
    borderWidth: 3,
    borderColor: '#111714',
  },
});
