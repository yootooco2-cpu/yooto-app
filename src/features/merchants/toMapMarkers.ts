import { markerState } from '@/features/discovery/editorial/markerState';
import type { MapMarker } from '@/features/map';

import { cryptogramForMerchant } from './cryptograms';
import { getMerchantCoverPhoto } from './photos';
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
    imageUrl: getMerchantCoverPhoto(merchant),
    title: merchant.name,
    category: merchant.category,
    cryptogramId: cryptogramForMerchant(merchant),
    rating: merchant.rating,
    open: merchant.isOpenNow,
    producer: merchant.isProducer,
    // État éditorial intrinsèque (Discovery) → anneau/halo du marqueur (Design System).
    state: markerState(merchant),
    // `pin` n'est significatif que pour les données de démo. Pour les données réelles
    // (pin absent → {0,0}), on laisse le placeholder dériver la position des coordonnées.
    placeholderPosition:
      merchant.pin.x !== 0 || merchant.pin.y !== 0 ? merchant.pin : undefined,
    data: merchant,
  }));
}
