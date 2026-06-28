import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { MapEngine } from '@/components/map';
import { MerchantCard } from '@/components/cards/MerchantCard';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YChip } from '@/components/ui/YChip';
import { YScreen } from '@/components/ui/YScreen';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import { useLocationPermission } from '@/features/location';
import {
  merchantsToMapMarkers,
  QUICK_FILTERS,
  useMerchants,
  type MerchantQuery,
  type QuickFilterId,
} from '@/features/merchants';

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<QuickFilterId[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const location = useLocationPermission();

  const nearbyActive = filters.includes('nearby');

  const toggleFilter = (id: QuickFilterId) => {
    const willEnable = !filters.includes(id);
    setFilters((current) =>
      current.includes(id) ? current.filter((f) => f !== id) : [...current, id],
    );
    // « Autour de moi » déclenche la demande de localisation ponctuelle.
    if (id === 'nearby' && willEnable && location.status === 'idle') {
      void location.request();
    }
  };

  // La recherche + les filtres + la position descendent dans le repository
  // (datasource serveur OU fallback local — même sémantique).
  const merchantQuery = useMemo<MerchantQuery>(
    () => ({
      search: query.trim() || undefined,
      filters,
      near: nearbyActive ? (location.coordinates ?? undefined) : undefined,
    }),
    [query, filters, nearbyActive, location.coordinates],
  );

  const { data, isLoading, isError, refetch } = useMerchants(merchantQuery);
  const results = useMemo(() => data ?? [], [data]);

  const markers = useMemo(() => merchantsToMapMarkers(results), [results]);

  return (
    <YScreen scroll>
      <YText variant="caption" color="primary">
        YOOTOO · Explorer
      </YText>
      <YText variant="title">Découvre les commerces responsables autour de toi</YText>

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

      {nearbyActive && location.status === 'denied' ? (
        <YText variant="caption" color="muted">
          Localisation indisponible — active-la pour trier par distance.
        </YText>
      ) : null}

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
          <MapEngine
            markers={markers}
            selectedId={selectedId}
            onSelectMarker={setSelectedId}
            userLocation={location.coordinates}
          />

          <YText variant="label" color="muted">
            {results.length} commerce{results.length > 1 ? 's' : ''} à proximité
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
                selected={merchant.id === selectedId}
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
  },
});
