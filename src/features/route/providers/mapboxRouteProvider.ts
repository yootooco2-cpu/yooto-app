/**
 * Structure du fournisseur Mapbox Directions — LOT 2A : AUCUN APPEL HTTP.
 *
 * Ce module contient uniquement :
 * - la correspondance mode → profil Mapbox (avec honnêteté sur le fauteuil
 *   roulant, qui n'a PAS de profil dédié) ;
 * - le parseur PUR de la réponse Directions en `geometries=geojson`
 *   (LineString, coordonnées [longitude, latitude]) ;
 * - une fabrique de provider dont le transport est INJECTÉ. Le transport
 *   HTTP réel (URL, token) arrive au Lot 2B : ici, aucun token n'est lu,
 *   enregistré ni affiché, aucune variable d'environnement n'est consultée.
 */

import type {
  MerchantCandidate,
  RouteEvaluation,
  RouteProvenance,
  TransportMode,
} from '../domain/types';
import type { GeoPoint } from '../domain/types';
import { isValidGeoPoint } from '../geo/geometry';
import type { PlannedRoute, RouteProviderPort, RouteRequest } from '../ports';

export interface MapboxProfileMapping {
  /** Profil Directions Mapbox, ou null si le mode n'est pas couvert. */
  profile: 'walking' | 'cycling' | 'driving' | null;
  /**
   * false = approximation assumée (ex. fauteuil roulant servi par le profil
   * piéton, sans garantie d'accessibilité du tracé — hypothèse à valider).
   */
  exact: boolean;
}

export function mapboxProfileForMode(mode: TransportMode): MapboxProfileMapping {
  switch (mode) {
    case 'walk':
      return { profile: 'walking', exact: true };
    case 'wheelchair':
      // Mapbox Directions n'a pas de profil fauteuil : le profil piéton est
      // une approximation explicite, jamais présentée comme un tracé PMR.
      return { profile: 'walking', exact: false };
    case 'bike':
      return { profile: 'cycling', exact: true };
    case 'car':
      return { profile: 'driving', exact: true };
    case 'transit':
      return { profile: null, exact: false };
  }
}

export type DirectionsParseFailure =
  | 'invalid_payload'
  | 'no_route'
  | 'invalid_geometry'
  | 'invalid_coordinates'
  | 'invalid_metrics';

export type DirectionsParseResult =
  | { ok: true; route: PlannedRoute }
  | { ok: false; reason: DirectionsParseFailure };

interface ParseMeta {
  routeVersion: number;
  departureAtMs: number;
  /** Provenance attachée à la route — Mapbox n'est JAMAIS qualifiable accessibilité. */
  provenance: RouteProvenance;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Parse un payload Directions (`geometries=geojson`) en PlannedRoute.
 * Contrôles : LineString, paires [longitude, latitude] (ordre GeoJSON),
 * coordonnées valides, au moins deux points, métriques numériques.
 * Une route vide, invalide ou à un seul point est rejetée avec un motif.
 */
export function parseDirectionsGeoJson(
  payload: unknown,
  meta: ParseMeta,
): DirectionsParseResult {
  if (!isRecord(payload)) return { ok: false, reason: 'invalid_payload' };

  const routes = payload.routes;
  if (!Array.isArray(routes) || routes.length === 0) {
    return { ok: false, reason: 'no_route' };
  }
  const first: unknown = routes[0];
  if (!isRecord(first)) return { ok: false, reason: 'invalid_payload' };

  const geometry = first.geometry;
  if (!isRecord(geometry) || geometry.type !== 'LineString' || !Array.isArray(geometry.coordinates)) {
    return { ok: false, reason: 'invalid_geometry' };
  }
  if (geometry.coordinates.length < 2) {
    return { ok: false, reason: 'invalid_geometry' };
  }

  const polyline: GeoPoint[] = [];
  for (const pair of geometry.coordinates as unknown[]) {
    if (!Array.isArray(pair) || pair.length < 2) {
      return { ok: false, reason: 'invalid_coordinates' };
    }
    const [longitude, latitude] = pair as [unknown, unknown];
    if (typeof longitude !== 'number' || typeof latitude !== 'number') {
      return { ok: false, reason: 'invalid_coordinates' };
    }
    // Ordre GeoJSON : [longitude, latitude] → GeoPoint {latitude, longitude}.
    const point: GeoPoint = { latitude, longitude };
    if (!isValidGeoPoint(point)) {
      return { ok: false, reason: 'invalid_coordinates' };
    }
    polyline.push(point);
  }

  const durationSeconds = first.duration;
  const distanceMeters = first.distance;
  if (
    typeof durationSeconds !== 'number' ||
    typeof distanceMeters !== 'number' ||
    !Number.isFinite(durationSeconds) ||
    !Number.isFinite(distanceMeters) ||
    durationSeconds < 0 ||
    distanceMeters < 0
  ) {
    return { ok: false, reason: 'invalid_metrics' };
  }

  return {
    ok: true,
    route: {
      polyline,
      durationSeconds,
      distanceMeters,
      routeVersion: meta.routeVersion,
      departureAtMs: meta.departureAtMs,
      provenance: meta.provenance,
    },
  };
}

/**
 * Transport injecté : au Lot 2B il portera l'appel HTTP (URL + token côté
 * transport, jamais ici). Au Lot 2A, seuls des payloads de fixtures y
 * transitent dans les tests.
 */
export type DirectionsTransport = (request: RouteRequest) => Promise<unknown>;

export interface MapboxRouteProviderDeps {
  transport: DirectionsTransport;
  /** Versionnage de route et horodatage injectés — pas de Date.now() ici. */
  nextRouteVersion: () => number;
  nowMs: () => number;
}

export class MapboxDirectionsError extends Error {
  constructor(readonly reason: DirectionsParseFailure | 'unsupported_mode') {
    super(`mapbox_directions_${reason}`);
    this.name = 'MapboxDirectionsError';
  }
}

export function createMapboxRouteProvider(deps: MapboxRouteProviderDeps): RouteProviderPort {
  return {
    async planRoute(request: RouteRequest): Promise<PlannedRoute> {
      const mapping = mapboxProfileForMode(request.mode);
      if (mapping.profile === null) {
        throw new MapboxDirectionsError('unsupported_mode');
      }
      const payload = await deps.transport(request);
      // Provenance : Mapbox ne porte AUCUNE donnée d'accessibilité — cette
      // route ne peut jamais être présentée comme une route de session
      // fauteuil (le registre le refuse par construction).
      const provenance: RouteProvenance = {
        providerId: 'mapbox',
        profileId: `mapbox/${mapping.profile}`,
        routingConfigVersion: 0,
        accessibilityDataSource: 'none',
        validationStatus: 'not_applicable',
        generatedAtMs: deps.nowMs(),
      };
      const parsed = parseDirectionsGeoJson(payload, {
        routeVersion: deps.nextRouteVersion(),
        departureAtMs: deps.nowMs(),
        provenance,
      });
      if (!parsed.ok) {
        throw new MapboxDirectionsError(parsed.reason);
      }
      return parsed.route;
    },
    evaluateDetours(
      _route: PlannedRoute,
      _candidates: readonly MerchantCandidate[],
      _nowMs: number,
    ): Promise<readonly RouteEvaluation[]> {
      // Matrix/détours précis : hors périmètre du Lot 2A.
      return Promise.reject(new Error('matrix_not_implemented_lot2a'));
    },
  };
}
