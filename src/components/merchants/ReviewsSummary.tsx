import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import {
  distributionRatio,
  formatRatingFr,
  hasRatingDistribution,
  starFill,
  type RatingDistribution,
} from '@/features/merchants/reviews';

interface Props {
  rating?: number;
  reviewCount?: number;
  /** Répartition par étoile — ABSENTE aujourd'hui ; barres affichées seulement si fournie. */
  distribution?: RatingDistribution | null;
  /** Lien « Voir les avis Google » (affiché uniquement si une URL existe). */
  onSeeReviews?: () => void;
}

/**
 * Bloc « Avis clients » ÉVOLUTIF :
 *  - sans note → état vide propre (aucun espace mort) ;
 *  - note + nombre d'avis → grande note + étoiles + « N avis Google » (+ lien optionnel) ;
 *  - répartition disponible (futur) → barres 5★→1★ ajoutées AUTOMATIQUEMENT, même layout.
 * Aucune donnée inventée. Thémé (suit le thème courant, y compris le scope sombre).
 */
export function ReviewsSummary({ rating, reviewCount, distribution, onSeeReviews }: Props) {
  const { colors } = useTheme();

  if (typeof rating !== 'number' || !Number.isFinite(rating)) {
    return (
      <YText variant="body" color="muted">
        Pas encore d’avis clients.
      </YText>
    );
  }

  const { full, empty } = starFill(rating);
  const stars = '★'.repeat(full) + '☆'.repeat(empty);
  const showBars = hasRatingDistribution(distribution);

  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <View style={styles.scoreBlock}>
          <View style={styles.scoreLine}>
            <YText variant="display">{formatRatingFr(rating)}</YText>
            <YText variant="caption" color="muted" style={styles.outOf}>
              / 5
            </YText>
          </View>
          <YText variant="subtitle" color="accent" style={styles.stars} accessibilityLabel={`Note ${formatRatingFr(rating)} sur 5`}>
            {stars}
          </YText>
          <YText variant="caption" color="muted">
            {typeof reviewCount === 'number' ? `${reviewCount} avis Google` : 'Avis Google'}
          </YText>
        </View>

        {/* Barres de répartition — UNIQUEMENT si la donnée par étoile existe (évolutif) */}
        {showBars && distribution ? (
          <View style={styles.bars}>
            {([5, 4, 3, 2, 1] as const).map((star) => (
              <View key={star} style={styles.barRow}>
                <YText variant="caption" color="muted" style={styles.barLabel}>
                  {star}★
                </YText>
                <View style={[styles.track, { backgroundColor: colors.border }]}>
                  <View
                    style={[styles.fill, { width: `${Math.round(distributionRatio(distribution, star) * 100)}%`, backgroundColor: colors.primary }]}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {onSeeReviews ? (
        <Pressable onPress={onSeeReviews} accessibilityRole="link">
          <YText variant="caption" color="primary">
            Voir les avis Google →
          </YText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  summary: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  scoreBlock: { gap: 2, minWidth: 96 },
  scoreLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  outOf: { marginBottom: spacing.xs },
  stars: { letterSpacing: 2 },
  bars: { flex: 1, gap: spacing.xs, justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 24 },
  track: { flex: 1, height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
