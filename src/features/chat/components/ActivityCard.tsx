import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

import { chatCategoryById } from '../categories';
import { actorKindLabel, isFresh, isLiveNow, isTerritoryActor, proximityHint } from '../logic';
import { formatChatTime } from '../time';
import type { ActivityItem, ChatParticipant } from '../types';
import { ActivityActions } from './ActivityActions';
import { ChatAvatar } from './ChatAvatar';
import { FollowPill } from './FollowPill';

/**
 * Carte VIVANTE du fil : émoji + auteur (vérifié) + proximité (🚶/🚴) + « en direct », puis une
 * barre d'actions discrète (réagir · répondre · enregistrer · partager). Suivre pour les acteurs
 * du territoire. Chaque élément ajoute de la valeur, jamais du bruit.
 */
export function ActivityCard({ item, author, now }: { item: ActivityItem; author?: ChatParticipant; now: number }) {
  const { colors } = useTheme();
  const category = chatCategoryById(item.categoryId);
  const accent = category?.accent ?? colors.primary;
  const kindLabel = author ? actorKindLabel(author.kind) : null;
  const prox = proximityHint(item.geo?.distanceKm);
  const live = isLiveNow(item.startsAt, item.endsAt, now);
  const fresh = isFresh(item.createdAt, now);
  const showFollow = Boolean(author && isTerritoryActor(author.kind));

  const meta = [kindLabel, item.place, prox ? `${prox.icon} ${prox.minutes} min` : null].filter(Boolean).join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.top}>
        <ChatAvatar name={author?.name ?? '—'} avatarUrl={author?.avatarUrl} size={40} />
        <View style={styles.who}>
          <View style={styles.nameRow}>
            <YText numberOfLines={1} style={[styles.name, { color: colors.text }]}>{author?.name ?? '—'}</YText>
            {author?.verified ? <Feather name="check-circle" size={13} color={accent} /> : null}
          </View>
          {meta ? (
            <YText variant="caption" color="muted" numberOfLines={1}>{meta}</YText>
          ) : null}
        </View>
        <View style={styles.right}>
          {live || fresh ? (
            <View style={styles.live}>
              <View style={styles.dot} />
              <YText style={styles.liveText}>{live ? 'En direct' : 'à l’instant'}</YText>
            </View>
          ) : (
            <YText variant="caption" color="muted">{formatChatTime(item.createdAt, now)}</YText>
          )}
          {showFollow && author ? <FollowPill actorId={author.id} /> : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.emojiWrap, { backgroundColor: `${accent}22` }]}>
          <YText style={styles.emoji}>{item.emoji}</YText>
        </View>
        <View style={styles.text}>
          <YText numberOfLines={2} style={[styles.title, { color: colors.text }]}>{item.title}</YText>
          {item.body ? (
            <YText variant="caption" color="muted" numberOfLines={2} style={styles.desc}>{item.body}</YText>
          ) : null}
        </View>
      </View>

      {category ? (
        <View style={[styles.tag, { backgroundColor: `${accent}1F` }]}>
          <Feather name={category.icon} size={12} color={accent} />
          <YText style={[styles.tagText, { color: accent }]}>{category.label}</YText>
        </View>
      ) : null}

      <ActivityActions item={item} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, ...shadows.sm },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  who: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  right: { alignItems: 'flex-end', gap: 6 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#69B96C' },
  liveText: { fontSize: 12, fontWeight: '800', color: '#69B96C' },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiWrap: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  desc: { lineHeight: 18 },
  tag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  tagText: { fontSize: 12, fontWeight: '700' },
});
