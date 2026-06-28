import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import {
  buildRecommendationReasons,
  CATEGORY_LABELS,
  getMerchantById,
  getMerchantTags,
} from '@/features/merchants';

export default function MerchantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const merchant = getMerchantById(id);

  if (!merchant) {
    return (
      <YScreen center>
        <YText variant="title">Commerce introuvable</YText>
        <YText variant="body" color="muted">
          Ce commerce n’existe pas ou n’est plus disponible.
        </YText>
        <YButton label="Retour à l’exploration" onPress={() => router.replace('/explore')} />
      </YScreen>
    );
  }

  const tags = getMerchantTags(merchant);
  const reasons = buildRecommendationReasons(merchant);

  return (
    <YScreen scroll>
      <YButton label="← Retour" variant="ghost" onPress={() => router.back()} />

      <YText variant="caption" color="primary">
        {CATEGORY_LABELS[merchant.category]}
      </YText>
      <YText variant="title">{merchant.name}</YText>

      <View style={styles.metaRow}>
        <YText variant="caption" color="muted">
          {merchant.distanceLabel}
        </YText>
        <YText variant="caption" color="muted">
          · Éco {merchant.ecoScore}/100
        </YText>
        <YText variant="caption" color={merchant.isOpenNow ? 'primary' : 'muted'}>
          · {merchant.isOpenNow ? 'Ouvert maintenant' : 'Fermé'}
        </YText>
      </View>

      {tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <YText variant="caption" color="default">
                {tag}
              </YText>
            </View>
          ))}
        </View>
      ) : null}

      <YText variant="body" color="muted">
        {merchant.description}
      </YText>

      <YCard>
        <YText variant="subtitle">Pourquoi c’est recommandé</YText>
        {reasons.map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <YText variant="body" color="primary">
              •
            </YText>
            <YText variant="body" color="muted" style={styles.reasonText}>
              {reason}
            </YText>
          </View>
        ))}
      </YCard>

      <YButton label="Y aller" fullWidth />
      <YButton label="Enregistrer" variant="secondary" fullWidth />
    </YScreen>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reasonText: {
    flexShrink: 1,
  },
});
