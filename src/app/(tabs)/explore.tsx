import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { MapEngine } from '@/components/map';
import { MerchantCard } from '@/components/cards/MerchantCard';
import { YChip } from '@/components/ui/YChip';
import { YScreen } from '@/components/ui/YScreen';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';
import { useLocationPermission } from '@/features/location';
import {
  DEMO_MERCHANTS,
  merchantsToMapMarkers,
  QUICK_FILTERS,
  type Merchant,
  type QuickFilterId,
} from '@/features/merchants';

function matchesFilters(merchant: Merchant, filters: QuickFilterId[]): boolean {
  if (filters.includes('open') && !merchant.isOpenNow) return false;
  if (filters.includes('producers') && !merchant.isProducer) return false;
  if (filters.includes('accessible') && !merchant.isAccessible) return false;
  if (filters.includes('rewards') && !merchant.hasRewards) return false;
  return true;
}

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<QuickFilterId[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const location = useLocationPermission();

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_MERCHANTS.filter((merchant) => {
      if (q && !`${merchant.name} ${merchant.description}`.toLowerCase().includes(q)) return false;
      return matchesFilters(merchant, filters);
    });
  }, [query, filters]);

  const markers = useMemo(() => merchantsToMapMarkers(results), [results]);
  const nearbyActive = filters.includes('nearby');

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

      <MapEngine
        markers={markers}
        selectedId={selectedId}
        onSelectMarker={setSelectedId}
        userLocation={location.coordinates}
      />

      <YText variant="label" color="muted">
        {results.length} commerce{results.length > 1 ? 's' : ''} à proximité
      </YText>

      {results.map((merchant) => (
        <MerchantCard
          key={merchant.id}
          merchant={merchant}
          selected={merchant.id === selectedId}
          onPress={() => router.push({ pathname: '/merchant/[id]', params: { id: merchant.id } })}
        />
      ))}
    </YScreen>
  );
}

const styles = StyleSheet.create({
  filters: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
});
