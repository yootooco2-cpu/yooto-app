import type { MapMarker } from '@/features/map';

import type { Merchant } from './types';

/**
 * Adapter domaine → moteur : convertit des commerces en marqueurs génériques.
 * Le moteur carto ne dépend ainsi jamais du type `Merchant`.
 * (Demain : `producersToMapMarkers`, `eventsToMapMarkers`… sur le même modèle.)
 */
export function merchantsToMapMarkers(merchants: Merchant[]): MapMarker<Merchant>[] {
  return merchants.map((merchant, index) => ({
    id: merchant.id,
    coordinate: merchant.coordinates,
    kind: 'merchant',
    label: String(index + 1),
    placeholderPosition: merchant.pin,
    data: merchant,
  }));
}
