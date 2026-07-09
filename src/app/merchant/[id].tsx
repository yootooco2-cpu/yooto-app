import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconAction } from '@/components/merchants/IconAction';
import { MerchantDetail } from '@/components/merchants/MerchantDetail';
import { Skeleton } from '@/components/ui/Skeleton';
import { YButton } from '@/components/ui/YButton';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import { trackEvent } from '@/features/discovery';
import { useMerchant } from '@/features/merchants';

export default function MerchantDetailScreen() {
  const router = useRouter();
  // `id` peut arriver en tableau (Expo Router) → on prend la 1ʳᵉ valeur, jamais un id figé.
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '');
  const { data: merchant, isLoading, isError, refetch } = useMerchant(id);
  // Favori : état visuel local (pas de persistance inventée ; branché plus tard sur un store).
  const [saved, setSaved] = useState(false);

  // Apprentissage : consulter une fiche renforce l'affinité pour sa catégorie.
  useEffect(() => {
    if (merchant) {
      trackEvent({ type: 'open_merchant', category: merchant.category, isProducer: merchant.isProducer });
    }
  }, [merchant]);

  if (!id) {
    return (
      <YScreen center>
        <YText variant="title">Commerce introuvable</YText>
        <YText variant="body" color="muted">
          Aucun commerce n’a été indiqué. Revenez à l’exploration pour en choisir un.
        </YText>
        <YButton label="Retour à l’exploration" onPress={() => router.replace('/explore')} />
      </YScreen>
    );
  }

  if (isLoading) {
    return (
      <YScreen>
        <View style={styles.skeleton}>
          <Skeleton width="100%" height={210} radius={18} />
          <Skeleton width="62%" height={24} radius={8} />
          <Skeleton width="40%" height={14} radius={7} />
          <View style={styles.skeletonPara}>
            <Skeleton width="100%" height={12} />
            <Skeleton width="94%" height={12} />
            <Skeleton width="80%" height={12} />
          </View>
        </View>
      </YScreen>
    );
  }

  if (isError) {
    return (
      <YScreen center>
        <YText variant="title">Une erreur est survenue</YText>
        <YText variant="body" color="muted">
          Impossible de charger ce commerce. Vérifiez votre connexion, puis réessayez.
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

  const onSave = () => {
    setSaved((v) => !v);
    trackEvent({ type: 'save', category: merchant.category, isProducer: merchant.isProducer });
  };

  return (
    <YScreen
      scroll
      gap="lg"
      footer={
        <View style={styles.ctaRow}>
          <IconAction icon="bookmark" label={saved ? 'Enregistré' : 'Enregistrer'} onPress={onSave} />
          <IconAction icon="map" label="Voir sur la carte" primary onPress={() => router.push('/explore')} />
        </View>
      }>
      <MerchantDetail merchant={merchant} onBack={() => router.back()} />
    </YScreen>
  );
}

const styles = StyleSheet.create({
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skeleton: { gap: spacing.md },
  skeletonPara: { gap: spacing.sm, marginTop: spacing.xs },
});
