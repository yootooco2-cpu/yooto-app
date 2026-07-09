import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

import { chatCategoryById } from '../categories';
import { avatarUri, isFresh, isLiveNow, isTerritoryActor, proximityHint } from '../logic';
import { formatChatTime } from '../time';
import type { ActivityItem, ChatParticipant } from '../types';
import { ActivityActions } from './ActivityActions';
import { ChatAvatar } from './ChatAvatar';
import { FollowPill } from './FollowPill';
import { PublicationTypeChip } from './PublicationTypeChip';

/**
 * Carte VIVANTE du fil : émoji + auteur (vérifié) + proximité (🚶/🚴) + « en direct », puis une
 * barre d'actions discrète (réagir · répondre · enregistrer · partager). Suivre pour les acteurs
 * du territoire. Chaque élément ajoute de la valeur, jamais du bruit.
 */
export function ActivityCard({ item, author, now, highlighted = false }: { item: ActivityItem; author?: ChatParticipant; now: number; highlighted?: boolean }) {
  const { colors } = useTheme();
  const router = useRouter();
  const merchantId = author?.merchantId;
  const category = chatCategoryById(item.categoryId);
  const accent = category?.accent ?? colors.primary;

  // Mise en évidence temporaire quand on arrive sur cette carte depuis une notification.
  const hl = useSharedValue(0);
  useEffect(() => {
    if (highlighted) hl.value = withSequence(withTiming(1, { duration: 220 }), withTiming(0, { duration: 1500 }));
  }, [highlighted, hl]);
  const hlStyle = useAnimatedStyle(() => ({ opacity: hl.value * 0.16 }));
  const isBiz = Boolean(author && isTerritoryActor(author.kind));
  const prox = proximityHint(item.geo?.distanceKm);
  const live = isLiveNow(item.startsAt, item.endsAt, now);
  const fresh = isFresh(item.createdAt, now);
  const showFollow = isBiz;
  // Présence désormais portée par la PASTILLE verte sur l'avatar (comme le profil utilisateur).
  const online = author?.online === true;

  // Sous le nom : uniquement l'utile → 📍 distance · 🚶/🚴 trajet (plus de texte « En ligne »).
  const distLabel = item.geo?.distanceLabel ?? (item.place ? item.place.replace(/^à\s*/, '') : null);
  const meta = [distLabel ? `📍 ${distLabel}` : null, prox ? `${prox.icon} ${prox.minutes} min` : null].filter(Boolean).join('   ·   ');

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Animated.View pointerEvents="none" style={[styles.hlOverlay, { backgroundColor: accent }, hlStyle]} />
      <View style={styles.top}>
        <Pressable
          style={styles.identity}
          disabled={!merchantId}
          onPress={() => merchantId && router.push(`/merchant/${merchantId}`)}
          accessibilityRole={merchantId ? 'button' : undefined}
          accessibilityLabel={merchantId ? `Voir la fiche de ${author?.name}` : undefined}>
          <ChatAvatar name={author?.name ?? '—'} avatarUrl={author ? avatarUri(author) : null} size={40} online={online} />
          <View style={styles.who}>
            <View style={styles.nameRow}>
              <YText numberOfLines={1} style={[styles.name, { color: colors.text }]}>{author?.name ?? '—'}</YText>
              {author?.verified ? <Feather name="check-circle" size={13} color={accent} /> : null}
            </View>
            {meta ? <YText variant="caption" color="muted" numberOfLines={1}>{meta}</YText> : null}
          </View>
        </Pressable>
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

      <View style={styles.text}>
        {/* Chip de type (Nouveauté, Offre…) à la place du gros emoji — même langage visuel que
            « À ne pas manquer ». Le commerçant (en-tête) reste le héros de la carte. */}
        <PublicationTypeChip kind={item.kind} accent={accent} />
        <YText numberOfLines={2} style={[styles.title, { color: colors.text }]}>{item.title}</YText>
        {item.body ? (
          <YText variant="caption" color="muted" numberOfLines={2} style={styles.desc}>{item.body}</YText>
        ) : null}
      </View>

      {/* Catégorie conservée mais DISCRÈTE (simple label gris + icône) : elle situe le thème sans
          rivaliser avec la chip de type ni alourdir la carte de deux pastilles colorées. */}
      {category ? (
        <View style={styles.tag}>
          <Feather name={category.icon} size={11} color={colors.mutedText} />
          <YText style={[styles.tagText, { color: colors.mutedText }]}>{category.label}</YText>
        </View>
      ) : null}

      <ActivityActions item={item} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, ...shadows.sm, overflow: 'hidden' },
  hlOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radii.xl },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  who: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  right: { alignItems: 'flex-end', gap: 6 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#69B96C' },
  liveText: { fontSize: 12, fontWeight: '800', color: '#69B96C' },
  text: { gap: 6 },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  desc: { lineHeight: 18 },
  tag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagText: { fontSize: 11.5, fontWeight: '600', letterSpacing: -0.1 },
});
