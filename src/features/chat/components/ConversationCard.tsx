import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

import { actorKindLabel, avatarUri, isTerritoryActor } from '../logic';
import { formatChatTime } from '../time';
import type { ChatConversationView } from '../types';
import { ChatAvatar } from './ChatAvatar';

/** Carte d'une conversation dans le fil — codes visuels YOOTOO (surface, coins, ombre) identiques
 *  aux cartes commerçants. Photo · nom · type · dernier message · heure · non lus · distance. */
export function ConversationCard({ view, now, onPress }: { view: ChatConversationView; now: number; onPress: () => void }) {
  const { colors } = useTheme();
  const section = useSectionTheme();
  const { conversation, author, lastMessage } = view;
  const typeLabel = actorKindLabel(author.kind);
  const typeColor = isTerritoryActor(author.kind) ? section.accent : colors.mutedText;
  const preview = lastMessage?.body ?? conversation.title;
  const time = lastMessage ? formatChatTime(lastMessage.createdAt, now) : formatChatTime(conversation.updatedAt, now);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Discussion avec ${author.name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.pressed,
      ]}>
      <ChatAvatar name={author.name} avatarUrl={avatarUri(author)} size={52} online={author.online === true} />

      <View style={styles.mid}>
        <View style={styles.nameRow}>
          <YText numberOfLines={1} style={[styles.name, { color: colors.text }]}>
            {author.name}
          </YText>
          {author.verified ? <Feather name="check-circle" size={13} color={section.accent} /> : null}
        </View>
        <View style={styles.metaRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.surfaceAlt }]}>
            <YText style={[styles.typeText, { color: typeColor }]}>{typeLabel}</YText>
          </View>
          {author.distanceLabel ? (
            <YText variant="caption" color="muted">
              · {author.distanceLabel}
            </YText>
          ) : null}
        </View>
        <YText variant="caption" color="muted" numberOfLines={1} style={styles.preview}>
          {preview}
        </YText>
      </View>

      <View style={styles.right}>
        <YText variant="caption" color="muted" style={styles.time}>
          {time}
        </YText>
        {conversation.unreadCount > 0 ? (
          <View style={[styles.unread, { backgroundColor: section.accent }]}>
            <YText style={[styles.unreadText, { color: section.onAccent }]}>{conversation.unreadCount}</YText>
          </View>
        ) : (
          <View style={styles.unreadSpacer} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    ...shadows.sm,
  },
  pressed: { opacity: 0.97, transform: [{ scale: 0.985 }] },
  mid: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill },
  typeText: { fontSize: 11, fontWeight: '700' },
  preview: { marginTop: 1 },
  right: { alignSelf: 'stretch', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.xs },
  time: { fontSize: 12 },
  unread: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 12, fontWeight: '800' },
  unreadSpacer: { height: 20 },
});
