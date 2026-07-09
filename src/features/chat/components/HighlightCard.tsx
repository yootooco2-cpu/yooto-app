import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { chatCategoryById } from '../categories';
import { isLiveNow } from '../logic';
import type { ActivityItem, ChatParticipant } from '../types';
import { PublicationTypeChip } from './PublicationTypeChip';

function startsLabel(startsAt: string, now: number): string {
  const d = Date.parse(startsAt) - now;
  if (d <= 0) return 'maintenant';
  const min = Math.round(d / 60_000);
  if (min < 60) return `dans ${min} min`;
  return `dans ${Math.round(min / 60)} h`;
}

/** « À ne pas manquer » — UNE seule carte, choisie automatiquement (événement imminent, offre,
 *  nouveau commerce…). Mise en avant discrète, teintée de la catégorie. */
export function HighlightCard({ item, author, now }: { item: ActivityItem; author?: ChatParticipant; now: number }) {
  const { colors } = useTheme();
  const section = useSectionTheme();
  const category = chatCategoryById(item.categoryId);
  const accent = category?.accent ?? section.accent;
  const live = isLiveNow(item.startsAt, item.endsAt, now);

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Feather name="zap" size={13} color={section.accent} />
        <YText style={[styles.headLabel, { color: glass.onDark }]}>À ne pas manquer</YText>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accent }]}>
        <View style={styles.body}>
          {/* Chip de type (Nouveauté, Dégustation…) à la place du gros emoji : plus sobre, premium. */}
          <PublicationTypeChip kind={item.kind} accent={accent} />
          <YText numberOfLines={2} style={[styles.title, { color: colors.text }]}>{item.title}</YText>
          <View style={styles.meta}>
            {live ? (
              <View style={styles.live}>
                <View style={styles.dot} />
                <YText style={styles.liveText}>En direct</YText>
              </View>
            ) : item.startsAt ? (
              <YText variant="caption" style={{ color: accent, fontWeight: '700' }}>{startsLabel(item.startsAt, now)}</YText>
            ) : null}
            {author ? (
              <YText variant="caption" color="muted" numberOfLines={1}>
                {author.name}
                {item.place ? ` · ${item.place}` : ''}
              </YText>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.xs },
  headLabel: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  card: { gap: spacing.sm, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1 },
  body: { gap: 6 },
  title: { fontSize: 15, fontWeight: '800', lineHeight: 20, letterSpacing: -0.2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#69B96C' },
  liveText: { fontSize: 12, fontWeight: '800', color: '#69B96C' },
});
