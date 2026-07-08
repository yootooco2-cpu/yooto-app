import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';

/** Palette d'avatars (teintes YOOTOO) — couleur déterministe par nom. */
const PALETTE = ['#3E86A8', '#B5533A', '#6E7F41', '#B08A50', '#8A5AA8', '#C6553F', '#3E7CB1'];

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

/** Avatar de membre : photo si dispo, sinon initiales sur pastille de couleur déterministe. */
export function ChatAvatar({ name, avatarUrl, size = 52 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const radius = size / 2;
  if (avatarUrl) {
    return <Image source={avatarUrl} style={{ width: size, height: size, borderRadius: radius }} contentFit="cover" recyclingKey={avatarUrl} />;
  }
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius, backgroundColor: colorFor(name) }]}>
      <YText color="inverse" style={[styles.initials, { fontSize: size * 0.36 }]}>
        {initialsOf(name)}
      </YText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '800' },
});
