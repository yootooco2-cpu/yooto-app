/**
 * Géométrie PURE pour la Strategy caméra — projection Web Mercator universelle (indépendante de
 * tout provider). Permet de cadrer une emprise (`reveal`) sans jamais appeler `map.fitBounds`.
 * Aucune dépendance Mapbox/DOM. → docs/map/CAMERA.md.
 */
import type { MapBounds, MapCoordinate } from '../types';

/** Taille de tuile Mapbox (px) — base du calcul de zoom. */
const WORLD_TILE = 512;

/** Centre géométrique d'une emprise. */
export function boundsCenter(b: MapBounds): MapCoordinate {
  return {
    latitude: (b.south + b.north) / 2,
    longitude: (b.west + b.east) / 2,
  };
}

/** Ordonnée Web Mercator normalisée (0 = nord, 1 = sud), pour une latitude en degrés. */
function mercatorY(latDeg: number): number {
  const lat = Math.max(-85.05112878, Math.min(85.05112878, latDeg));
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
}

/**
 * Niveau de zoom qui fait tenir l'emprise `bounds` dans un viewport (px), padding déduit sur
 * chaque bord. Pur (Web Mercator). Ne clampe pas : c'est à l'appelant de borner à la hiérarchie.
 * Emprise dégénérée (span nul) → zoom max (22).
 */
export function fitZoom(
  bounds: MapBounds,
  viewport: { width: number; height: number },
  padding: number,
): number {
  const usableW = Math.max(1, viewport.width - padding * 2);
  const usableH = Math.max(1, viewport.height - padding * 2);

  const lngFraction = Math.abs(bounds.east - bounds.west) / 360;
  const latFraction = Math.abs(mercatorY(bounds.south) - mercatorY(bounds.north));

  const zoomFor = (px: number, fraction: number): number =>
    fraction > 0 ? Math.log2(px / (WORLD_TILE * fraction)) : 22;

  return Math.min(zoomFor(usableW, lngFraction), zoomFor(usableH, latFraction));
}

/** Borne une valeur dans [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Distance (mètres) entre deux coordonnées — Haversine. Pur. Sert la dead-zone du Scheduler. */
export function haversineMeters(a: MapCoordinate, b: MapCoordinate): number {
  const R = 6_371_000; // rayon terrestre moyen (m)
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
