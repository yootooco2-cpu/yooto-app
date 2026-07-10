import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

import { avatarUri } from '../logic';
import { CURRENT_USER_ID } from '../mockData';
import { useChatStore } from '../store';
import { ChatAvatar } from './ChatAvatar';

/**
 * ZONE D'EXPRESSION — l'invitation discrète en tête du fil : l'habitant n'est pas un
 * spectateur, il peut interpeller SON territoire (question publique, demande de reco,
 * discussion locale). Ouvre le composeur existant (/chat/new) — le pipeline de
 * publication (types, cryptogrammes) est déjà en place.
 */
export function FeedComposerPrompt() {
  const router = useRouter();
  const section = useSectionTheme();
  const me = useChatStore((s) => s.participants[CURRENT_USER_ID]);

  return (
    <Pressable
      onPress={() => router.push('/chat/new')}
      accessibilityRole="button"
      accessibilityLabel="Poser une question aux commerçants autour de vous"
      style={({ pressed }) => [styles.wrap, glass.panel, shadows.sm, pressed && styles.pressed]}>
      <ChatAvatar name={me?.name ?? 'Vous'} avatarUrl={me ? avatarUri(me) : null} size={34} />
      <YText variant="body" numberOfLines={1} style={styles.placeholder}>
        Une question pour les commerçants autour de vous ?
      </YText>
      <View style={[styles.cta, { backgroundColor: section.accent }]}>
        <Feather name="edit-3" size={14} color={section.onAccent} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
  placeholder: { flex: 1, color: glass.onDarkMuted, fontSize: 13.5 },
  cta: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
