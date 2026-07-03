import type { MapViewport } from './types';

// viewport — helpers PURS liés au viewport carte (PR3 persistance).

/**
 * Un viewport est-il exploitable pour une restauration ?
 * Garde-fou contre un état corrompu → sinon repli sur la région par défaut.
 */
export function isPlausibleViewport(v: MapViewport | null | undefined): v is MapViewport {
  if (!v) return false;
  const { center, zoom, bounds } = v;
  const num = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  if (!num(zoom) || zoom < 0 || zoom > 24) return false;
  if (!num(center?.latitude) || center.latitude < -90 || center.latitude > 90) return false;
  if (!num(center?.longitude) || center.longitude < -180 || center.longitude > 180) return false;
  if (!bounds || !num(bounds.west) || !num(bounds.east) || !num(bounds.south) || !num(bounds.north)) {
    return false;
  }
  return bounds.west <= bounds.east && bounds.south <= bounds.north;
}
