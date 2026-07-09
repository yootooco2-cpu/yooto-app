import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';

import { useChatStore } from '../store';

/** Pastille « Suivre » → « Suivi » pour un acteur (commerçant, producteur, artisan, association). */
export function FollowPill({ actorId }: { actorId: string }) {
  const { colors } = useTheme();
  const section = useSectionTheme();
  const following = useChatStore((s) => Boolean(s.following[actorId]));
  const toggleFollow = useChatStore((s) => s.toggleFollow);

  return (
    <Pressable
      onPress={() => void toggleFollow(actorId)}
      accessibilityRole="button"
      accessibilityState={{ selected: following }}
      accessibilityLabel={following ? 'Suivi' : 'Suivre'}
      style={({ pressed }) => [
        styles.pill,
        following ? { borderColor: colors.border, backgroundColor: colors.surfaceAlt } : { borderColor: section.accent },
        pressed && styles.pressed,
      ]}>
      {following ? <Feather name="check" size={12} color={colors.mutedText} /> : null}
      <YText style={[styles.label, { color: following ? colors.mutedText : section.accent }]}>{following ? 'Suivi' : 'Suivre'}</YText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1 },
  pressed: { opacity: 0.7 },
  label: { fontSize: 12.5, fontWeight: '700' },
});
