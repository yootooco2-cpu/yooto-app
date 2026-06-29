import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { MapEngine, MapMerchantPreview } from '@/components/map';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YChip } from '@/components/ui/YChip';
import { YScreen } from '@/components/ui/YScreen';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import { QUICK_FILTERS, useMerchantSearch } from '@/features/merchants';

export default function MapScreen() {
  const router = useRouter();
  const { query, setQuery, filters, toggleFilter, location, userLocation, nearbyActive, results, markers, isLoading, isError, refetch } =
    useMerchantSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedMerchant = results.find((merchant) => merchant.id === selectedId) ?? null;

  return (
    <YScreen gap="sm" padding="md">
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

      {nearbyActive && location.status === 'denied' ? (
        <YText variant="caption" color="muted">
          Localisation indisponible — active-la pour trier par distance.
        </YText>
      ) : null}

      <View style={styles.mapArea}>
        {isLoading ? (
          <View style={styles.fillCenter}>
            <YText variant="body" color="muted">
              Chargement de la carte…
            </YText>
          </View>
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
              fill
              markers={markers}
              selectedId={selectedId}
              userLocation={userLocation}
              onSelectMarker={setSelectedId}
            />
            {selectedMerchant ? (
              <View style={styles.previewWrap}>
                <MapMerchantPreview
                  merchant={selectedMerchant}
                  onClose={() => setSelectedId(null)}
                  onPress={() =>
                    router.push({ pathname: '/merchant/[id]', params: { id: selectedMerchant.id } })
                  }
                />
              </View>
            ) : null}
          </>
        )}
      </View>
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
  mapArea: {
    flex: 1,
  },
  previewWrap: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
  },
  fillCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
