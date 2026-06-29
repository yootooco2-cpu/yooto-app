import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { MerchantCard } from '@/components/cards/MerchantCard';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YChip } from '@/components/ui/YChip';
import { YScreen } from '@/components/ui/YScreen';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import { QUICK_FILTERS, useMerchantSearch } from '@/features/merchants';

export default function MerchantsScreen() {
  const router = useRouter();
  const { query, setQuery, filters, toggleFilter, results, isLoading, isError, refetch } =
    useMerchantSearch();

  return (
    <YScreen scroll>
      <YText variant="caption" color="primary">
        YOOTOO · Commerçants
      </YText>
      <YText variant="title">Tous les commerces responsables</YText>

      <YSearchBar value={query} onChangeText={setQuery} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
            Vérifie ta connexion, puis réessaie.
          </YText>
          <YButton label="Réessayer" variant="secondary" onPress={() => void refetch()} />
        </YCard>
      ) : (
        <>
          <YText variant="label" color="muted">
            {results.length} commerce{results.length > 1 ? 's' : ''}
          </YText>

          {results.length === 0 ? (
            <YText variant="body" color="muted">
              Aucun commerce ne correspond à ta recherche.
            </YText>
          ) : (
            results.map((merchant) => (
              <MerchantCard
                key={merchant.id}
                merchant={merchant}
                onPress={() =>
                  router.push({ pathname: '/merchant/[id]', params: { id: merchant.id } })
                }
              />
            ))
          )}
        </>
      )}
    </YScreen>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
    alignItems: 'center',
  },
});
