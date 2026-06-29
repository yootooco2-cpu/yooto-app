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
    // `pin` n'est significatif que pour les données de démo. Pour les données réelles
    // (pin absent → {0,0}), on laisse le placeholder dériver la position des coordonnées.
    placeholderPosition:
      merchant.pin.x !== 0 || merchant.pin.y !== 0 ? merchant.pin : undefined,
    data: merchant,
  }));
}
