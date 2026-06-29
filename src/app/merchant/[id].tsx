import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
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
  getMerchantCoverPhoto,
  getMerchantTags,
  useMerchant,
} from '@/features/merchants';

export default function MerchantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: merchant, isLoading, isError, refetch } = useMerchant(id);

  if (isLoading) {
    return (
      <YScreen center>
        <YText variant="body" color="muted">
          Chargement du commerce…
        </YText>
      </YScreen>
    );
  }

  if (isError) {
    return (
      <YScreen center>
        <YText variant="title">Une erreur est survenue</YText>
        <YText variant="body" color="muted">
          Impossible de charger ce commerce. Vérifie ta connexion, puis réessaie.
        </YText>
        <YButton label="Réessayer" variant="secondary" onPress={() => void refetch()} />
        <YButton label="Retour à l’exploration" variant="ghost" onPress={() => router.replace('/explore')} />
      </YScreen>
    );
  }

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
  const gallery = merchant.galleryPhotos ?? [];

  return (
    <YScreen scroll>
      <YButton label="← Retour" variant="ghost" onPress={() => router.back()} />

      <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={200} />

      {gallery.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.galleryScroll}
          contentContainerStyle={styles.gallery}>
          {gallery.map((photo, index) => (
            <View key={`${photo}-${index}`} style={styles.galleryThumb}>
              <MerchantPhoto uri={photo} height={84} rounded={radii.md} />
            </View>
          ))}
        </ScrollView>
      ) : null}

      <YText variant="caption" color="primary">
        {CATEGORY_LABELS[merchant.category]}
      </YText>
      <YText variant="title">{merchant.name}</YText>

      <View style={styles.metaRow}>
        {merchant.distanceLabel !== '—' || merchant.city ? (
          <YText variant="caption" color="muted">
            {merchant.distanceLabel !== '—' ? merchant.distanceLabel : merchant.city}
          </YText>
        ) : null}
        {typeof merchant.rating === 'number' ? (
          <YText variant="caption" color="muted">
            · ★ {merchant.rating.toFixed(1)}
          </YText>
        ) : null}
        {typeof merchant.ecoScore === 'number' ? (
          <YText variant="caption" color="muted">
            · Éco {merchant.ecoScore}/100
          </YText>
        ) : null}
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

      {merchant.description ? (
        <YText variant="body" color="muted">
          {merchant.description}
        </YText>
      ) : null}

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
  galleryScroll: {
    flexGrow: 0,
  },
  gallery: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  galleryThumb: {
    width: 120,
  },
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
