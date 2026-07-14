import type { Station } from './stations';
import type { TransitRoute } from './types';

/**
 * Modèle de la carte Bus & Tram — fonctions PURES (testables sans carte ni réseau).
 * Trois responsabilités : filtre Tous/Tramway/Bus, fenêtrage par viewport (jamais les
 * 2 123 marqueurs d'un coup), regroupement aux zooms larges.
 */

export type TransitMode = 'tous' | 'tram' | 'bus';

export interface StationWithRoutes extends Station {
  routes: TransitRoute[];
  distanceKm?: number;
}

/** 'tram' | 'bus' | 'mixte' selon les lignes desservies (route_type GTFS : 0 tram, 3 bus). */
export function stationKind(routes: TransitRoute[]): 'tram' | 'bus' | 'mixte' | 'inconnu' {
  const hasTram = routes.some((r) => r.routeType === 0);
  const hasBus = routes.some((r) => r.routeType === 3);
  return hasTram && hasBus ? 'mixte' : hasTram ? 'tram' : hasBus ? 'bus' : 'inconnu';
}

/**
 * Filtre par mode : une station n'apparaît que si elle dessert le mode, et ses lignes
 * sont RESTREINTES au mode (une station mixte en mode Bus ne montre que ses bus).
 * 'tous' rend les stations inchangées (transition immédiate, aucun recalcul lourd).
 */
export function filterByMode<T extends StationWithRoutes>(stations: T[], mode: TransitMode): T[] {
  if (mode === 'tous') return stations;
  const type = mode === 'tram' ? 0 : 3;
  const out: T[] = [];
  for (const s of stations) {
    const routes = s.routes.filter((r) => r.routeType === type);
    if (routes.length) out.push({ ...s, routes });
  }
  return out;
}

const KM_PER_DEG_LAT = 111.32;
const kmBetween = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number => {
  const dLat = (a.latitude - b.latitude) * KM_PER_DEG_LAT;
  const dLng = (a.longitude - b.longitude) * KM_PER_DEG_LAT * Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

/** Rayon visible approximatif (km) pour un zoom Mapbox sur mobile, marge ×1.5 incluse. */
export function radiusForZoom(zoom: number, latitude: number): number {
  // Largeur monde ≈ 40075 km × cos(lat) ; écran ~390 px sur 512·2^zoom px de monde.
  const world = 40075 * Math.cos((latitude * Math.PI) / 180);
  const viewportKm = (world * 390) / (512 * 2 ** zoom);
  return Math.max(0.3, viewportKm * 1.5);
}

/**
 * Stations du SECTEUR VISIBLE (centre+zoom) avec marge, plafonnées aux `cap` plus proches
 * du centre — la carte ne reçoit jamais tout le référentiel.
 */
export function visibleStations<T extends StationWithRoutes>(
  stations: T[],
  center: { latitude: number; longitude: number },
  zoom: number,
  cap = 80,
): T[] {
  const radius = radiusForZoom(zoom, center.latitude);
  return stations
    .map((s) => ({ s, d: kmBetween(center, s) }))
    .filter((x) => x.d <= radius)
    .sort((a, b) => a.d - b.d)
    .slice(0, cap)
    .map((x) => x.s);
}

export interface StationCluster {
  latitude: number;
  longitude: number;
  count: number;
  ids: number[];
  kind: 'tram' | 'bus' | 'mixte' | 'inconnu';
}

export type MapItem<T extends StationWithRoutes> =
  | { type: 'station'; station: T }
  | { type: 'cluster'; cluster: StationCluster };

/** Seuil de zoom au-dessous duquel on regroupe (grille) pour éviter la surcharge. */
export const CLUSTER_MAX_ZOOM = 14.2;

export function clusterForZoom<T extends StationWithRoutes>(stations: T[], zoom: number): MapItem<T>[] {
  if (zoom >= CLUSTER_MAX_ZOOM) return stations.map((station) => ({ type: 'station', station }));
  const cellDeg = 0.0035 * 2 ** (CLUSTER_MAX_ZOOM - zoom); // grille qui grossit en dézoomant
  const cells = new Map<string, T[]>();
  for (const s of stations) {
    const k = `${Math.round(s.latitude / cellDeg)}|${Math.round(s.longitude / cellDeg)}`;
    const list = cells.get(k) ?? [];
    list.push(s);
    cells.set(k, list);
  }
  const out: MapItem<T>[] = [];
  for (const group of cells.values()) {
    if (group.length === 1) out.push({ type: 'station', station: group[0] });
    else {
      const routes = group.flatMap((g) => g.routes);
      out.push({
        type: 'cluster',
        cluster: {
          latitude: group.reduce((a, g) => a + g.latitude, 0) / group.length,
          longitude: group.reduce((a, g) => a + g.longitude, 0) / group.length,
          count: group.length,
          ids: group.map((g) => g.id),
          kind: stationKind(routes),
        },
      });
    }
  }
  return out;
}

/**
 * Résolution de la STATION SÉLECTIONNÉE face au filtre courant — la sélection ne meurt
 * JAMAIS silencieusement : elle est résolue sur le référentiel complet ; le mode ne fait
 * que restreindre les lignes affichées (et se signale quand l'arrêt ne dessert pas le mode).
 */
export function resolveSelected<T extends StationWithRoutes>(
  stations: T[],
  selectedId: number | null,
  mode: TransitMode,
): { station: T; routesForMode: T['routes']; servesMode: boolean } | null {
  if (selectedId === null) return null;
  const station = stations.find((s) => s.id === selectedId);
  if (!station) return null;
  const routesForMode = mode === 'tous' ? station.routes : station.routes.filter((r) => r.routeType === (mode === 'tram' ? 0 : 3));
  return { station, routesForMode, servesMode: routesForMode.length > 0 };
}
