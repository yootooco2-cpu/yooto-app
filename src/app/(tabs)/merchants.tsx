import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { MerchantCard } from '@/components/cards/MerchantCard';
import { MerchantCardSkeleton } from '@/components/cards/MerchantCardSkeleton';
import { MerchantPhotoCoverageDev } from '@/components/dev/MerchantPhotoCoverageDev';
import { FavoritesButton } from '@/components/favorites/FavoritesButton';
import { SectionScreen } from '@/components/theme/SectionScreen';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { YScreen } from '@/components/ui/YScreen';
import { SupportContactFooter } from '@/components/ui/SupportContactFooter';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import {
  SearchMenu,
  sortForDisplay,
  useMerchantSearch,
  type Merchant,
  type MerchantPredicate,
} from '@/features/merchants';

/** Placeholders de la grille pendant le chargement (skeletons). */
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

export default function MerchantsScreen() {
  const router = useRouter();
  const { query, setQuery, results, isLoading, isError, refetch } = useMerchantSearch();

  // Filtre catégorie (prédicat) émis par le MENU OFFICIEL PARTAGÉ → post-filtre local de la grille.
  const [categoryMatch, setCategoryMatch] = useState<MerchantPredicate | null>(null);
  // Décision produit 12/07 : TOUTES les fiches sont visibles — le score de complétude
  // ORDONNE (les plus riches d'abord), il n'exclut jamais. Les discrètes restent présentes.
  const displayed = useMemo(() => {
    const base = categoryMatch ? results.filter(categoryMatch) : results;
    return sortForDisplay(base);
  }, [results, categoryMatch]);

  const numColumns = 3;

  const renderItem = ({ item }: { item: Merchant }) => (
    <View style={styles.cell}>
      <MerchantCard
        merchant={item}
        onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: item.id } })}
      />
    </View>
  );

  return (
    <SectionScreen section="commerce">
      <YScreen transparent gap="sm" padding="lg">
        {/* MENU OFFICIEL PARTAGÉ (identique à Carte & Accueil) : recherche + catégories + profil. */}
        <SearchMenu
          query={query}
          onQueryChange={setQuery}
          onCategoryChange={(m) => setCategoryMatch(() => m)}
          trailing={<FavoritesButton onPress={() => router.push('/explore')} />}
        />

        {isLoading ? (
          <FlatList
            key="cols-skeleton"
            style={styles.list}
            data={SKELETON_ROWS}
            keyExtractor={(i) => `sk-${i}`}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? styles.column : undefined}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={<Skeleton width={92} height={13} />}
            renderItem={() => (
              <View style={styles.cell}>
                <MerchantCardSkeleton />
              </View>
            )}
          />
        ) : isError ? (
          <YCard variant="outline">
            <YText variant="subtitle">Impossible de charger les commerces</YText>
            <YText variant="body" color="muted">
              Vérifiez votre connexion, puis réessayez.
            </YText>
            <YButton label="Réessayer" variant="secondary" onPress={() => void refetch()} />
          </YCard>
        ) : (
          // FlatList = virtualisation : seuls les éléments visibles sont rendus.
          <FlatList
            key={`cols-${numColumns}`}
            style={styles.list}
            data={displayed}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? styles.column : undefined}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            ListHeaderComponent={
              <YText variant="label" color="muted">
                {displayed.length} commerce{displayed.length > 1 ? 's' : ''}
              </YText>
            }
            ListEmptyComponent={
              <YText variant="body" color="muted">
                Aucun commerce ne correspond à votre recherche.
              </YText>
            }
          />
        )}
        <SupportContactFooter />
        {__DEV__ ? <MerchantPhotoCoverageDev /> : null}
      </YScreen>
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  column: {
    gap: spacing.md,
  },
  cell: {
    flex: 1,
  },
});
