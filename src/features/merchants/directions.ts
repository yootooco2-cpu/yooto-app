import { isPlausibleCoordinate } from '@/features/map/cluster/geojson';

import type { Merchant } from './types';

// directions — construction PURE d'une URL d'itinéraire Google Maps vers un commerce.
// Utilise les coordonnées si plausibles (France), sinon une requête texte nom + adresse + ville.
// Aucune dépendance React Native → testable.

const DIR_BASE = 'https://www.google.com/maps/dir/?api=1&destination=';

/** URL d'itinéraire vers le commerce (coordonnées si fiables, sinon requête texte). */
export function buildDirectionsUrl(merchant: Merchant): string {
  if (isPlausibleCoordinate(merchant.coordinates)) {
    const { latitude, longitude } = merchant.coordinates;
    return `${DIR_BASE}${latitude},${longitude}`;
  }
  const query = [merchant.name, merchant.address, merchant.city].filter(Boolean).join(' ');
  return `${DIR_BASE}${encodeURIComponent(query)}`;
}
