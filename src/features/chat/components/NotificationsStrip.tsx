import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

import { avatarUri } from '../logic';
import { notifTime, type FeedNotification } from '../notifications';
import type { ChatParticipant } from '../types';
import { ChatAvatar } from './ChatAvatar';
import { PublicationCrypto } from './PublicationCrypto';

/**
 * 🔔 NOTIFICATIONS — centre social en tête du fil. À la place des statistiques : de vraies
 * publications récentes (commerce + cryptogramme + message spécifique + temps écoulé), triées
 * intelligemment. Chaque ligne appelle au clic → ouvre/scrolle vers la publication dans le fil.
 */
export function NotificationsStrip({
  notifications,
  participants,
  now,
  onOpen,
}: {
  notifications: FeedNotification[];
  participants: Record<string, ChatParticipant>;
  now: number;
  onOpen: (id: string) => void;
}) {
  const { colors } = useTheme();
  if (notifications.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <YText style={styles.headEmoji}>🔔</YText>
        <YText style={[styles.title, { color: glass.onDark }]}>Notifications</YText>
      </View>

      <View style={styles.list}>
        {notifications.map((n) => {
          const author = participants[n.authorId];
          return (
            <Pressable
              key={n.id}
              onPress={() => onOpen(n.id)}
              accessibilityRole="button"
              accessibilityLabel={`${author?.name ?? ''} — ${n.message}`}
              style={({ pressed }) => [styles.row, glass.panel, shadows.sm, pressed && styles.pressed]}>
              <View style={styles.avatarWrap}>
                <ChatAvatar name={author?.name ?? '—'} avatarUrl={author ? avatarUri(author) : null} size={46} online={author?.online === true} />
                <View style={[styles.badge, { borderColor: colors.surface, backgroundColor: colors.surface }]}>
                  <PublicationCrypto id={n.crypto} size={22} />
                </View>
              </View>

              <View style={styles.mid}>
                <YText numberOfLines={1} style={[styles.name, { color: glass.onDark }]}>{author?.name ?? '—'}</YText>
                <YText numberOfLines={2} style={[styles.msg, { color: glass.onDarkMuted }]}>{n.message}</YText>
              </View>

              <YText style={[styles.time, { color: glass.onDarkMuted }]}>{notifTime(n.createdAt, now)}</YText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.xs },
  headEmoji: { fontSize: 15 },
  title: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  list: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radii.lg },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  avatarWrap: { width: 46, height: 46 },
  badge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    borderRadius: 14,
    borderWidth: 2,
    padding: 1,
    ...shadows.sm,
  },
  mid: { flex: 1, gap: 1 },
  name: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  msg: { fontSize: 12.5, lineHeight: 16 },
  time: { fontSize: 11, alignSelf: 'flex-start' },
});
