/**
 * Géométrie pure — aucune dépendance (ni Turf, ni Mapbox).
 *
 * Méthode : projection équirectangulaire locale centrée sur le point évalué
 * (x = Δlng·cos(lat)·M, y = Δlat·M), puis distance euclidienne
 * point→segment classique. L'erreur de cette approximation est négligeable
 * aux échelles d'un corridor urbain (< 0,1 % sous quelques kilomètres).
 *
 * Limites documentées : pas de gestion de l'antiméridien (±180°) ni des
 * pôles — hors du territoire d'usage. Tout est déterministe.
 *
 * Complexité : distance point→polyligne = O(S) segments ;
 * bounding box d'une polyligne = O(S).
 */

import type { GeoPoint } from '../domain/types';

/** Mètres par degré de latitude (constante WGS84 approchée, déterministe). */
export const METERS_PER_DEGREE_LAT = 111_320;

/**
 * Coordonnée exploitable : finie, dans les bornes WGS84, et différente de
 * la sentinelle {0,0} utilisée dans le dépôt pour « non géocodé ».
 */
export function isValidGeoPoint(point: GeoPoint): boolean {
  const { latitude, longitude } = point;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

export interface BoundingBox {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

/** Retourne `null` pour une polyligne vide — jamais une bbox inventée. */
export function boundingBoxOfPolyline(polyline: readonly GeoPoint[]): BoundingBox | null {
  if (polyline.length === 0) return null;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;
  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  for (const point of polyline) {
    if (point.latitude < minLatitude) minLatitude = point.latitude;
    if (point.latitude > maxLatitude) maxLatitude = point.latitude;
    if (point.longitude < minLongitude) minLongitude = point.longitude;
    if (point.longitude > maxLongitude) maxLongitude = point.longitude;
  }
  return { minLatitude, maxLatitude, minLongitude, maxLongitude };
}

/**
 * Étend une bbox d'une marge en mètres. La marge en longitude utilise le
 * cos de la latitude la plus défavorable (la plus proche du pôle) pour ne
 * jamais sous-estimer la zone — le préfiltre reste conservateur.
 */
export function expandBoundingBox(bbox: BoundingBox, marginMeters: number): BoundingBox {
  const latMargin = marginMeters / METERS_PER_DEGREE_LAT;
  const worstLat = Math.max(Math.abs(bbox.minLatitude), Math.abs(bbox.maxLatitude));
  const cosLat = Math.max(Math.cos((worstLat * Math.PI) / 180), 1e-6);
  const lngMargin = marginMeters / (METERS_PER_DEGREE_LAT * cosLat);
  return {
    minLatitude: bbox.minLatitude - latMargin,
    maxLatitude: bbox.maxLatitude + latMargin,
    minLongitude: bbox.minLongitude - lngMargin,
    maxLongitude: bbox.maxLongitude + lngMargin,
  };
}

export function boundingBoxContains(bbox: BoundingBox, point: GeoPoint): boolean {
  return (
    point.latitude >= bbox.minLatitude &&
    point.latitude <= bbox.maxLatitude &&
    point.longitude >= bbox.minLongitude &&
    point.longitude <= bbox.maxLongitude
  );
}

/**
 * Distance en mètres entre `point` et le segment [a, b].
 * Projection locale centrée sur `point` (origine), puis projection
 * orthogonale bornée sur le segment (paramètre t ∈ [0,1]).
 */
export function pointToSegmentDistanceMeters(
  point: GeoPoint,
  a: GeoPoint,
  b: GeoPoint,
): number {
  const metersPerDegLng =
    METERS_PER_DEGREE_LAT * Math.cos((point.latitude * Math.PI) / 180);
  const ax = (a.longitude - point.longitude) * metersPerDegLng;
  const ay = (a.latitude - point.latitude) * METERS_PER_DEGREE_LAT;
  const bx = (b.longitude - point.longitude) * metersPerDegLng;
  const by = (b.latitude - point.latitude) * METERS_PER_DEGREE_LAT;

  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    // Segment dégénéré : distance au point.
    return Math.hypot(ax, ay);
  }
  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/**
 * Distance minimale en mètres entre `point` et une polyligne.
 * Polyligne vide → +Infinity (aucune distance inventée) ;
 * un seul point → distance à ce point.
 * Complexité : O(S).
 */
export function distanceToPolylineMeters(
  point: GeoPoint,
  polyline: readonly GeoPoint[],
): number {
  if (polyline.length === 0) return Number.POSITIVE_INFINITY;
  if (polyline.length === 1) {
    return pointToSegmentDistanceMeters(point, polyline[0], polyline[0]);
  }
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < polyline.length - 1; i += 1) {
    const distance = pointToSegmentDistanceMeters(point, polyline[i], polyline[i + 1]);
    if (distance < min) min = distance;
  }
  return min;
}
