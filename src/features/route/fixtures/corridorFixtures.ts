/**
 * Fixtures géographiques du Lot 2A : candidats positionnés autour du trajet
 * simulé Comédie → Arceaux et générateur de corpus représentatif.
 *
 * Tout est déterministe : le générateur utilise un LCG (générateur
 * congruentiel linéaire) à graine fixe — jamais Math.random().
 */

import type { GeoPoint, MerchantCandidate } from '../domain/types';
import { METERS_PER_DEGREE_LAT } from '../geo/geometry';
import { makeCandidate, SIMULATED_ROUTE_COMEDIE_ARCEAUX } from './index';

/** Décale un point de `meters` mètres plein nord (latitude pure). */
export function offsetNorthMeters(point: GeoPoint, meters: number): GeoPoint {
  return {
    latitude: point.latitude + meters / METERS_PER_DEGREE_LAT,
    longitude: point.longitude,
  };
}

/** Point médian d'un segment central du trajet simulé (sur l'axe). */
export const POINT_ON_ROUTE: GeoPoint = {
  latitude:
    (SIMULATED_ROUTE_COMEDIE_ARCEAUX.polyline[2].latitude +
      SIMULATED_ROUTE_COMEDIE_ARCEAUX.polyline[3].latitude) /
    2,
  longitude:
    (SIMULATED_ROUTE_COMEDIE_ARCEAUX.polyline[2].longitude +
      SIMULATED_ROUTE_COMEDIE_ARCEAUX.polyline[3].longitude) /
    2,
};

/** Candidats contrôlés autour du trajet Comédie → Arceaux. */
export function makeComedieArceauxCandidates(corridorWidthMeters: number): MerchantCandidate[] {
  return [
    // Exactement sur le trajet (sommet de la polyligne → distance 0).
    makeCandidate({
      merchantId: 'on-route',
      position: { ...SIMULATED_ROUTE_COMEDIE_ARCEAUX.polyline[2] },
    }),
    // Nettement dans le corridor.
    makeCandidate({
      merchantId: 'inside',
      position: offsetNorthMeters(POINT_ON_ROUTE, corridorWidthMeters * 0.5),
    }),
    // Juste à l'extérieur du corridor.
    makeCandidate({
      merchantId: 'just-outside',
      position: offsetNorthMeters(POINT_ON_ROUTE, corridorWidthMeters + 25),
    }),
    // Très loin (rejeté dès la bounding box).
    makeCandidate({
      merchantId: 'far-away',
      position: { latitude: 43.95, longitude: 4.4 },
    }),
    // Coordonnées invalides : sentinelle non géocodée {0,0}.
    makeCandidate({
      merchantId: 'invalid-zero',
      position: { latitude: 0, longitude: 0 },
    }),
    // Coordonnées invalides : NaN.
    makeCandidate({
      merchantId: 'invalid-nan',
      position: { latitude: Number.NaN, longitude: 3.87 },
    }),
  ];
}

/** LCG déterministe (Numerical Recipes) — retourne un flottant [0,1). */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/**
 * Corpus représentatif : `count` candidats répartis déterministiquement
 * dans un carré ~±0,05° (~5,5 km) autour du centre du trajet simulé —
 * l'ordre de grandeur d'un corpus urbain chargé côté client.
 */
export function makeRepresentativeCorpus(count: number, seed = 20260715): MerchantCandidate[] {
  const random = createSeededRandom(seed);
  const center = POINT_ON_ROUTE;
  const corpus: MerchantCandidate[] = [];
  for (let i = 0; i < count; i += 1) {
    corpus.push(
      makeCandidate({
        merchantId: `corpus-${String(i).padStart(5, '0')}`,
        position: {
          latitude: center.latitude + (random() - 0.5) * 0.1,
          longitude: center.longitude + (random() - 0.5) * 0.1,
        },
      }),
    );
  }
  return corpus;
}
