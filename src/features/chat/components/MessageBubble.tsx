import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { isTerritoryActor } from '../logic';
import { formatChatTime } from '../time';
import type { ChatMessage, ChatParticipant } from '../types';
import { ChatAvatar } from './ChatAvatar';

/** Vert olive de la charte (univers « De saison ») — signature premium des bulles commerçants. */
const OLIVE = '#6E7F41';
const AVATAR = 28;

/**
 * Bulle de conversation façon messagerie premium, fidèle à la DA YOOTOO :
 *  • commerçants / producteurs / associations → GAUCHE, fond olive-anthracite, logo + nom.
 *  • particuliers (dont moi) → DROITE, fond teinté de l'univers, photo à droite.
 * Heure + statut (envoyé/lu) discrets. Avatar & nom seulement en tête d'une série de messages.
 */
export function MessageBubble({
  message,
  author,
  mine,
  showAvatar,
  showName,
  now,
}: {
  message: ChatMessage;
  author?: ChatParticipant;
  mine: boolean;
  showAvatar: boolean;
  showName: boolean;
  now: number;
}) {
  const { colors } = useTheme();
  const section = useSectionTheme();
  const isPro = !mine && Boolean(author && isTerritoryActor(author.kind));

  const bubbleStyle = mine
    ? { backgroundColor: section.accent, borderTopRightRadius: 4 }
    : isPro
      ? { backgroundColor: colors.surfaceAlt, borderLeftWidth: 2, borderLeftColor: OLIVE, borderTopLeftRadius: 4 }
      : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 4 };
  const textColor = mine ? section.onAccent : colors.text;
  const metaColor = mine ? section.onAccent : colors.mutedText;
  const status = message.status ?? 'read';

  const avatarNode = showAvatar ? (
    <ChatAvatar name={author?.name ?? '—'} avatarUrl={author?.avatarUrl} size={AVATAR} />
  ) : (
    <View style={styles.spacer} />
  );

  return (
    <Animated.View entering={FadeInDown.duration(220)} style={[styles.wrap, mine ? styles.wrapRight : styles.wrapLeft]}>
      {showName && !mine && author ? (
        <View style={styles.senderRow}>
          <YText variant="caption" numberOfLines={1} style={[styles.sender, { color: isPro ? OLIVE : colors.mutedText }]}>
            {author.name}
          </YText>
          {author.verified ? <Feather name="check-circle" size={11} color={isPro ? OLIVE : section.accent} /> : null}
        </View>
      ) : null}

      <View style={[styles.row, mine ? styles.rowRight : styles.rowLeft]}>
        {!mine ? avatarNode : null}
        <View style={[styles.bubble, bubbleStyle]}>
          <YText style={[styles.body, { color: textColor }]}>{message.body}</YText>
          <View style={styles.meta}>
            <YText style={[styles.time, { color: metaColor }]}>{formatChatTime(message.createdAt, now)}</YText>
            {mine ? (
              <MaterialCommunityIcons name={status === 'sent' ? 'check' : 'check-all'} size={14} color={metaColor} />
            ) : null}
          </View>
        </View>
        {mine ? avatarNode : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '86%', marginBottom: spacing.sm },
  wrapLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  wrapRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3, marginLeft: AVATAR + spacing.sm },
  sender: { flexShrink: 1, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  spacer: { width: AVATAR },
  bubble: { flexShrink: 1, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radii.lg },
  body: { fontSize: 15, lineHeight: 21 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 },
  time: { fontSize: 10.5, opacity: 0.85 },
});
