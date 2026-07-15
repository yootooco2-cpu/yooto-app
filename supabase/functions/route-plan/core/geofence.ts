/**
 * Géorestriction du pilote — zone EXPLICITE autour de Montpellier,
 * versionnée (jamais une bounding box « France »).
 * Haversine locale : aucun import de l'application.
 */

import type { GeoPoint } from './contracts.ts';

export interface PilotZone {
  id: string;
  center: GeoPoint;
  radiusMeters: number;
}

/** Rayon 30 km : hypothèse pilote à confirmer avant le Lot 3C. */
export const PILOT_ZONE_MONTPELLIER_V1: PilotZone = {
  id: 'montpellier_v1',
  center: { latitude: 43.611, longitude: 3.877 },
  radiusMeters: 30_000,
};

const EARTH_RADIUS_METERS = 6_371_008.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInPilotZone(point: GeoPoint, zone: PilotZone): boolean {
  return haversineMeters(point, zone.center) <= zone.radiusMeters;
}
