import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';

/** Palette d'avatars (teintes YOOTOO) — couleur déterministe par nom. */
const PALETTE = ['#3E86A8', '#B5533A', '#6E7F41', '#B08A50', '#8A5AA8', '#C6553F', '#3E7CB1'];
/** Anneau/bord mat de la pastille de présence — IDENTIQUE au profil utilisateur. */
const RING = '#0E1310';

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * Avatar de membre : photo si dispo, sinon initiales sur pastille de couleur déterministe.
 * `online` affiche une PASTILLE VERTE en bas à droite — même langage visuel (taille, position,
 * couleur, bord mat) que l'indicateur de présence de l'avatar utilisateur.
 */
export function ChatAvatar({ name, avatarUrl, size = 52, online = false }: { name: string; avatarUrl?: string | null; size?: number; online?: boolean }) {
  const radius = size / 2;
  const dot = Math.round(size * 0.3);
  const dotBorder = Math.max(2, Math.round(size * 0.055));

  return (
    <View style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image source={avatarUrl} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" recyclingKey={avatarUrl} />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: radius, backgroundColor: colorFor(name) }]}>
          <YText color="inverse" style={[styles.initials, { fontSize: size * 0.36 }]}>
            {initialsOf(name)}
          </YText>
        </View>
      )}
      {online ? <View style={[styles.dot, { width: dot, height: dot, borderRadius: dot / 2, borderWidth: dotBorder }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '800' },
  dot: { position: 'absolute', right: -1, bottom: -1, backgroundColor: '#69B96C', borderColor: RING },
});
