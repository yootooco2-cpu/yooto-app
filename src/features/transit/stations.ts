import type { TransitStop } from './types';

/**
 * Regroupement des QUAIS en STATIONS — pur et testé.
 * Le GTFS TaM expose une station parente (location_type 1, sans horaire) et ses quais
 * (location_type 0, porteurs des horaires, souvent homonymes). L'utilisateur pense
 * « station » : on fusionne les quais de même nom à moins de `radiusKm`, et les parentes
 * ne créent jamais d'entrée en double (leurs horaires sont vides par construction GTFS).
 */

export interface Station {
  /** pk du quai représentatif (clé de navigation stable). */
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  /** Tous les quais fusionnés — la fiche agrège leurs horaires. */
  stopIds: string[];
  stopPks: number[];
  /** PMR officielle agrégée : 1 si au moins un quai accessible, 2 si tous « non », sinon null. */
  wheelchairBoarding: number | null;
}

const kmApprox = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number => {
  const dLat = (a.latitude - b.latitude) * 111.32;
  const dLng = (a.longitude - b.longitude) * 111.32 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

export function groupStopsIntoStations(stops: TransitStop[], radiusKm = 0.25): Station[] {
  const quays = stops.filter((s) => s.locationType !== 1);
  const parents = stops.filter((s) => s.locationType === 1);
  const byName = new Map<string, TransitStop[]>();
  for (const q of quays) {
    const list = byName.get(q.name) ?? [];
    list.push(q);
    byName.set(q.name, list);
  }
  const stations: Station[] = [];
  for (const [name, list] of byName) {
    const clusters: TransitStop[][] = [];
    for (const q of list) {
      const cluster = clusters.find((c) => c.some((x) => kmApprox(x, q) <= radiusKm));
      if (cluster) cluster.push(q);
      else clusters.push([q]);
    }
    for (const cluster of clusters) {
      const wb = cluster.some((s) => s.wheelchairBoarding === 1) ? 1
        : cluster.length && cluster.every((s) => s.wheelchairBoarding === 2) ? 2 : null;
      stations.push({
        id: cluster[0].id,
        name,
        latitude: cluster.reduce((a, s) => a + s.latitude, 0) / cluster.length,
        longitude: cluster.reduce((a, s) => a + s.longitude, 0) / cluster.length,
        stopIds: cluster.map((s) => s.stopId),
        stopPks: cluster.map((s) => s.id),
        wheelchairBoarding: wb,
      });
    }
  }
  // Une parente isolée SANS quai homonyme proche : conservée (mieux vaut une station sans
  // horaire déclarée honnêtement que sa disparition) — cas rare, jamais un doublon.
  for (const p of parents) {
    const covered = stations.some((st) => st.name === p.name && kmApprox(st, p) <= radiusKm);
    if (!covered) stations.push({ id: p.id, name: p.name, latitude: p.latitude, longitude: p.longitude, stopIds: [p.stopId], stopPks: [p.id], wheelchairBoarding: p.wheelchairBoarding ?? null });
  }
  return stations;
}
