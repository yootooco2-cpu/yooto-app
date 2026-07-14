/** Transit (Bus & Tram) — types du domaine. Tables transit_* uniquement, jamais merchants. */

export interface TransitStop {
  id: number;               // pk Supabase
  stopId: string;           // id GTFS officiel
  name: string;
  latitude: number;
  longitude: number;
  /** Accessibilité PMR OFFICIELLE (GTFS wheelchair_boarding : 1 oui, 2 non, 0/null inconnu). */
  wheelchairBoarding: number | null;
  /** GTFS location_type : 1 = station parente (sans horaire), 0/null = quai. */
  locationType: number | null;
  /** Dérivé côté client quand la position est connue. */
  distanceKm?: number;
}

export interface TransitRoute {
  id: number;
  routeId: string;
  shortName: string | null;
  longName: string | null;
  /** Spécification GTFS : 0 tram, 3 bus. */
  routeType: number;
  /** Couleur officielle du réseau (hex sans #). */
  color: string | null;
}

export interface TransitTrip {
  tripId: string;
  routeId: string;
  serviceId: string;
  headsign: string | null;
  wheelchairAccessible: number | null;
}

export interface StopTimeRow {
  tripId: string;
  departureSecs: number;    // secondes depuis le début du jour de service (peut dépasser 86400)
  /** Quai d'origine (stations multi-quais) — sert la fusion temps réel. */
  stopId?: string;
}

export interface TransitService {
  serviceId: string;
  days: [boolean, boolean, boolean, boolean, boolean, boolean, boolean]; // lun..dim
  startDate: string;        // YYYY-MM-DD
  endDate: string;
}

export interface ServiceException {
  serviceId: string;
  date: string;             // YYYY-MM-DD
  exceptionType: 1 | 2;     // 1 ajouté, 2 retiré
}

/** Desserte agrégée (021) : lignes par arrêt — alimente les pastilles de l'écran liste. */
export interface StopService {
  stopPk: number;
  routePk: number;
  direction: string;
}

/** Un départ calculé, prêt à afficher. */
export interface Departure {
  /** Course GTFS — clé de fusion avec les mises à jour temps réel. */
  tripId?: string;
  /** Quai de départ (stations multi-quais). */
  stopId?: string;
  routeId: string;
  headsign: string;
  epochMs: number;          // instant réel du départ
  /** 'theorique' (GTFS statique) ou 'temps-reel' (GTFS-RT frais < 300 s). */
  source: 'theorique' | 'temps-reel';
}
