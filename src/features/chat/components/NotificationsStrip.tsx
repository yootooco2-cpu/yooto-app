import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
 * 🔔 NOTIFICATIONS — COMPACTES (hiérarchie sociale : le FEED est le contenu principal,
 * les notifications restent accessibles sans jamais dominer l'écran). Rangée horizontale
 * de chips discrètes — avatar + cryptogramme + message 1 ligne + temps. Clic → scrolle
 * vers la publication dans le fil.
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
        <YText style={[styles.title, { color: glass.onDarkMuted }]}>Notifications</YText>
        <YText style={[styles.count, { color: glass.onDarkMuted }]}>{notifications.length}</YText>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {notifications.map((n) => {
          const author = participants[n.authorId];
          return (
            <Pressable
              key={n.id}
              onPress={() => onOpen(n.id)}
              accessibilityRole="button"
              accessibilityLabel={`${author?.name ?? ''} — ${n.message}`}
              style={({ pressed }) => [styles.chip, glass.panel, shadows.sm, pressed && styles.pressed]}>
              <View style={styles.avatarWrap}>
                <ChatAvatar name={author?.name ?? '—'} avatarUrl={author ? avatarUri(author) : null} size={34} online={author?.online === true} />
                <View style={[styles.badge, { borderColor: colors.surface, backgroundColor: colors.surface }]}>
                  <PublicationCrypto id={n.crypto} size={16} />
                </View>
              </View>

              <View style={styles.mid}>
                <YText numberOfLines={1} style={[styles.name, { color: glass.onDark }]}>{author?.name ?? '—'}</YText>
                <YText numberOfLines={1} style={[styles.msg, { color: glass.onDarkMuted }]}>{n.message}</YText>
              </View>

              <YText style={[styles.time, { color: glass.onDarkMuted }]}>{notifTime(n.createdAt, now)}</YText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.xs },
  title: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2, textTransform: 'uppercase' },
  count: { fontSize: 11, fontWeight: '700', opacity: 0.8 },
  row: { gap: spacing.xs, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    width: 230,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  avatarWrap: { width: 34, height: 34 },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    borderRadius: 10,
    borderWidth: 2,
    padding: 1,
    ...shadows.sm,
  },
  mid: { flex: 1, gap: 0 },
  name: { fontSize: 12.5, fontWeight: '800', letterSpacing: -0.2 },
  msg: { fontSize: 11.5, lineHeight: 14 },
  time: { fontSize: 10, alignSelf: 'flex-start' },
});
