import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { formatChatTime } from '../time';
import type { ChatMessage } from '../types';

/** Bulle de message — la mienne à droite (teinte univers), les autres à gauche (surface). */
export function MessageBubble({
  message,
  mine,
  senderName,
  showSender,
  now,
}: {
  message: ChatMessage;
  mine: boolean;
  senderName?: string;
  showSender?: boolean;
  now: number;
}) {
  const { colors } = useTheme();
  const section = useSectionTheme();

  return (
    <View style={[styles.wrap, mine ? styles.wrapMine : styles.wrapOther]}>
      {showSender && !mine && senderName ? (
        <YText variant="caption" style={[styles.sender, { color: section.accentSoft }]} numberOfLines={1}>
          {senderName}
        </YText>
      ) : null}
      <View
        style={[
          styles.bubble,
          mine
            ? { backgroundColor: section.accent, borderTopRightRadius: 4 }
            : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderTopLeftRadius: 4 },
        ]}>
        <YText style={[styles.body, { color: mine ? section.onAccent : colors.text }]}>{message.body}</YText>
      </View>
      <YText variant="caption" color="muted" style={styles.time}>
        {formatChatTime(message.createdAt, now)}
      </YText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '82%', gap: 3, marginBottom: spacing.md },
  wrapMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  sender: { fontWeight: '700', paddingHorizontal: spacing.xs },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  body: { fontSize: 15, lineHeight: 21 },
  time: { fontSize: 11, paddingHorizontal: spacing.xs },
});
