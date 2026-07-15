/**
 * Corridor de recherche autour d'un itinéraire.
 *
 * Un corridor se construit UNE FOIS par version de route (jamais à chaque
 * variation GPS brute) : il pré-calcule la bounding box étendue qui sert de
 * préfiltre bon marché avant tout calcul précis de distance.
 *
 * Complexité : construction O(S) ; test d'appartenance O(1) (bbox) puis
 * O(S) (distance précise) uniquement pour les points ayant passé la bbox.
 */

import type { GeoPoint } from '../domain/types';
import type { PlannedRoute } from '../ports';
import type { BoundingBox } from './geometry';
import {
  boundingBoxContains,
  boundingBoxOfPolyline,
  distanceToPolylineMeters,
  expandBoundingBox,
  isValidGeoPoint,
} from './geometry';

export interface Corridor {
  polyline: readonly GeoPoint[];
  widthMeters: number;
  /** Version de route d'origine — le corridor est caduc si elle change. */
  routeVersion: number;
  /** Bbox de la polyligne étendue de la largeur — préfiltre conservateur. */
  expandedBoundingBox: BoundingBox;
  segmentCount: number;
}

export type CorridorBuildFailure =
  | 'empty_route'
  | 'single_point_route'
  | 'invalid_coordinates'
  | 'invalid_width';

export type CorridorBuildResult =
  | { ok: true; corridor: Corridor }
  | { ok: false; reason: CorridorBuildFailure };

export interface CorridorBuildInput {
  polyline: readonly GeoPoint[];
  widthMeters: number;
  routeVersion: number;
}

/**
 * Construit le corridor en validant la route : une route vide, à un seul
 * point ou aux coordonnées invalides est rejetée avec un motif explicite —
 * jamais un corridor silencieusement faux.
 */
export function buildCorridor(input: CorridorBuildInput): CorridorBuildResult {
  if (!Number.isFinite(input.widthMeters) || input.widthMeters <= 0) {
    return { ok: false, reason: 'invalid_width' };
  }
  if (input.polyline.length === 0) {
    return { ok: false, reason: 'empty_route' };
  }
  if (input.polyline.length === 1) {
    return { ok: false, reason: 'single_point_route' };
  }
  if (input.polyline.some((point) => !isValidGeoPoint(point))) {
    return { ok: false, reason: 'invalid_coordinates' };
  }
  const bbox = boundingBoxOfPolyline(input.polyline);
  if (bbox === null) {
    return { ok: false, reason: 'empty_route' };
  }
  return {
    ok: true,
    corridor: {
      polyline: input.polyline,
      widthMeters: input.widthMeters,
      routeVersion: input.routeVersion,
      expandedBoundingBox: expandBoundingBox(bbox, input.widthMeters),
      segmentCount: input.polyline.length - 1,
    },
  };
}

/** Corridor d'une route planifiée — la largeur vient de la config par mode. */
export function corridorForRoute(
  route: PlannedRoute,
  widthMeters: number,
): CorridorBuildResult {
  return buildCorridor({
    polyline: route.polyline,
    widthMeters,
    routeVersion: route.routeVersion,
  });
}

/** Distance précise du point à l'axe de la route (mètres). */
export function distanceToCorridorRouteMeters(corridor: Corridor, point: GeoPoint): number {
  return distanceToPolylineMeters(point, corridor.polyline);
}

/**
 * Tolérance flottante déterministe (1 µm) : un point mathématiquement à la
 * limite exacte du corridor reste inclus malgré l'arrondi IEEE 754 (erreur
 * observée ~1e-10 m aux latitudes France). Sans effet au-delà.
 */
export const CORRIDOR_EPSILON_METERS = 1e-6;

/**
 * Appartenance au corridor : préfiltre bbox O(1), puis distance précise.
 * La limite exacte (distance == largeur) est INCLUSE — règle déterministe.
 */
export function isInCorridor(corridor: Corridor, point: GeoPoint): boolean {
  if (!boundingBoxContains(corridor.expandedBoundingBox, point)) return false;
  return (
    distanceToCorridorRouteMeters(corridor, point) <=
    corridor.widthMeters + CORRIDOR_EPSILON_METERS
  );
}
