import { haversineKm } from '@/lib/geo/haversine';

import { clamp01 } from './context';
import type { Signal } from './types';

/** Distance réelle utilisateur → commerce (si position connue). */
const distanceSignal: Signal = (merchant, ctx) => {
  if (!ctx.userLocation) return null;
  const km = haversineKm(ctx.userLocation, merchant.coordinates);
  const value = clamp01(1 - km / 10); // pertinence forte ≤ ~1 km, nulle ≥ 10 km
  const reason = km < 1 ? 'À quelques minutes de vous' : `À ${km.toFixed(1)} km de vous`;
  return { key: 'distance', weight: 1.5, value, reason: value > 0.5 ? reason : undefined };
};

/** Ouverture actuelle. */
const openNowSignal: Signal = (merchant) => ({
  key: 'openNow',
  weight: 1,
  value: merchant.isOpenNow ? 1 : 0.2,
  reason: merchant.isOpenNow ? 'Ouvert actuellement' : undefined,
});

/** Qualité perçue (note Google). */
const ratingSignal: Signal = (merchant) => {
  if (typeof merchant.rating !== 'number') return null;
  const value = clamp01(merchant.rating / 5);
  return {
    key: 'rating',
    weight: 1.2,
    value,
    reason: merchant.rating >= 4.5 ? 'Très apprécié près de chez vous' : undefined,
  };
};

/** Producteur local. */
const producerSignal: Signal = (merchant) =>
  merchant.isProducer
    ? { key: 'producer', weight: 0.8, value: 1, reason: 'Producteur local en vente directe' }
    : null;

/** Impact écologique. */
const ecoSignal: Signal = (merchant) => {
  if (typeof merchant.ecoScore !== 'number') return null;
  const value = clamp01(merchant.ecoScore / 100);
  return {
    key: 'eco',
    weight: 0.6,
    value,
    reason: merchant.ecoScore >= 80 ? "Engagé pour l'environnement" : undefined,
  };
};

export const merchantSignals: Signal[] = [
  distanceSignal,
  openNowSignal,
  ratingSignal,
  producerSignal,
  ecoSignal,
];
