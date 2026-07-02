import { useRouter } from 'expo-router';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { MerchantCard } from '@/components/cards/MerchantCard';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YChip } from '@/components/ui/YChip';
import { YScreen } from '@/components/ui/YScreen';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import { QUICK_FILTERS, useMerchantSearch, type Merchant } from '@/features/merchants';

export default function MerchantsScreen() {
  const router = useRouter();
  const { query, setQuery, filters, toggleFilter, results, isLoading, isError, refetch } =
    useMerchantSearch();

  // Grille fixe : exactement 3 colonnes sur toutes les tailles d'écran.
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
    <YScreen gap="sm" padding="lg">
      <YText variant="caption" color="primary">
        YOOTOO · Commerçants
      </YText>

      <YSearchBar value={query} onChangeText={setQuery} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}>
        {QUICK_FILTERS.map((filter) => (
          <YChip
            key={filter.id}
            label={filter.label}
            active={filters.includes(filter.id)}
            onPress={() => toggleFilter(filter.id)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <YText variant="body" color="muted">
          Chargement des commerces…
        </YText>
      ) : isError ? (
        <YCard variant="outline">
          <YText variant="subtitle">Impossible de charger les commerces</YText>
          <YText variant="body" color="muted">
            Vérifiez votre connexion, puis réessayez.
          </YText>
          <YButton label="Réessayer" variant="secondary" onPress={() => void refetch()} />
        </YCard>
      ) : (
        // FlatList = virtualisation : seuls les éléments visibles sont rendus
        // (scroll fluide même avec des centaines de commerces).
        <FlatList
          key={`cols-${numColumns}`}
          style={styles.list}
          data={results}
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
              {results.length} commerce{results.length > 1 ? 's' : ''}
            </YText>
          }
          ListEmptyComponent={
            <YText variant="body" color="muted">
              Aucun commerce ne correspond à votre recherche.
            </YText>
          }
        />
      )}
    </YScreen>
  );
}

const styles = StyleSheet.create({
  filtersScroll: {
    flexGrow: 0,
  },
  filters: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
    alignItems: 'center',
  },
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
