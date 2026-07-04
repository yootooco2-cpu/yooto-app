/// <reference types="jest" />
import type { MapMarker } from '@/features/map';

import { buildMerchantFeatureCollection } from './geojson';

const marker = (over: Partial<MapMarker>): MapMarker => ({
  id: 'm1',
  coordinate: { latitude: 43.61, longitude: 3.87 }, // Montpellier
  kind: 'merchant',
  ...over,
});

describe('buildMerchantFeatureCollection — état éditorial', () => {
  it("porte l'état intrinsèque du marqueur dans les propriétés de la feature", () => {
    const fc = buildMerchantFeatureCollection([marker({ state: 'exceptional' })]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties.state).toBe('exceptional');
  });

  it("retombe sur 'standard' quand l'état est absent", () => {
    const fc = buildMerchantFeatureCollection([marker({})]);
    expect(fc.features[0].properties.state).toBe('standard');
  });

  it('ignore les coordonnées aberrantes (hors France)', () => {
    const fc = buildMerchantFeatureCollection([
      marker({ id: 'ok', state: 'recommended' }),
      marker({ id: 'ko', coordinate: { latitude: 0, longitude: 0 } }),
    ]);
    expect(fc.features.map((f) => f.properties.id)).toEqual(['ok']);
  });
});
