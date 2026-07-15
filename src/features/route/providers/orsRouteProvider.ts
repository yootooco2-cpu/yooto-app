/**
 * Fournisseur OpenRouteService — LOT 2B VOLET 1 : AUCUN APPEL HTTP RÉEL.
 *
 * Ce module est entièrement pur :
 * - le transport est INJECTÉ (le HTTP réel, la clé et le proxy Edge
 *   arriveront dans un lot ultérieur, sur autorisation explicite) ;
 * - aucun accès à process.env ni EXPO_PUBLIC_* ;
 * - construction déterministe de la requête Directions ORS (POST,
 *   coordonnées [longitude, latitude], profil et restrictions fauteuil
 *   injectés depuis la configuration versionnée) ;
 * - parseur strict de la réponse GeoJSON (FeatureCollection/LineString) ;
 * - erreurs typées par code — AUCUNE coordonnée, origine, destination ou
 *   géométrie ne figure dans un message d'erreur ou un log ;
 * - aucune donnée inventée : tout champ manquant ou invalide est un rejet.
 */

import type {
  MerchantCandidate,
  RouteEvaluation,
  RouteProvenance,
} from '../domain/types';
import type { GeoPoint } from '../domain/types';
import { isValidGeoPoint } from '../geo/geometry';
import type { PlannedRoute, RouteProviderPort, RouteRequest } from '../ports';
import type { WheelchairRoutingConfig } from '../routingConfig';

export const ORS_PROVIDER_ID = 'ors' as const;

/** Profils ORS activés pour le pilote (décision GATE 2B). */
export type OrsProfile = 'wheelchair' | 'foot-walking';

/** Restrictions fauteuil au format ORS (`options.profile_params.restrictions`). */
export interface OrsWheelchairRestrictions {
  maximum_incline: 3 | 6 | 10 | 15 | 'any';
  maximum_sloped_kerb: 0.03 | 0.06 | 0.1 | 'any';
  minimum_width?: number;
  surface_type: string;
  smoothness_type: string;
  track_type: string;
}

export interface OrsDirectionsBody {
  /** Paires [longitude, latitude] — ordre GeoJSON/ORS. */
  coordinates: readonly (readonly [number, number])[];
  instructions: false;
  options?: {
    profile_params: {
      restrictions: OrsWheelchairRestrictions;
    };
  };
}

export interface OrsDirectionsRequest {
  profile: OrsProfile;
  body: OrsDirectionsBody;
}

export type OrsRouteFailure =
  | 'unsupported_mode'
  | 'invalid_request_coordinates'
  | 'invalid_payload'
  | 'no_route'
  | 'invalid_geometry'
  | 'invalid_coordinates'
  | 'invalid_metrics'
  | 'provider_unavailable';

/**
 * Erreur typée : le message est UNIQUEMENT le code du motif — jamais de
 * coordonnées ni de géométrie.
 */
export class OrsDirectionsError extends Error {
  constructor(readonly reason: OrsRouteFailure) {
    super(`ors_directions_${reason}`);
    this.name = 'OrsDirectionsError';
  }
}

export type BuildOrsRequestResult =
  | { ok: true; request: OrsDirectionsRequest }
  | { ok: false; reason: 'unsupported_mode' | 'invalid_request_coordinates' };

function restrictionsFromConfig(config: WheelchairRoutingConfig): OrsWheelchairRestrictions {
  const { params } = config;
  const restrictions: OrsWheelchairRestrictions = {
    maximum_incline: params.maximumIncline,
    maximum_sloped_kerb: params.maximumSlopedKerb,
    surface_type: params.surfaceType,
    smoothness_type: params.smoothnessType,
    track_type: params.trackType,
  };
  if (params.minimumWidth !== undefined) {
    restrictions.minimum_width = params.minimumWidth;
  }
  return restrictions;
}

/**
 * Construction déterministe de la requête Directions ORS.
 * Modes pilote uniquement : wheelchair (restrictions injectées) et walk
 * (foot-walking). bike/car/transit → 'unsupported_mode', jamais un profil
 * de substitution silencieux.
 */
export function buildOrsDirectionsRequest(
  request: RouteRequest,
  wheelchairConfig: WheelchairRoutingConfig,
): BuildOrsRequestResult {
  if (!isValidGeoPoint(request.origin) || !isValidGeoPoint(request.destination)) {
    return { ok: false, reason: 'invalid_request_coordinates' };
  }
  const coordinates: readonly (readonly [number, number])[] = [
    [request.origin.longitude, request.origin.latitude],
    [request.destination.longitude, request.destination.latitude],
  ];

  switch (request.mode) {
    case 'wheelchair':
      return {
        ok: true,
        request: {
          profile: 'wheelchair',
          body: {
            coordinates,
            instructions: false,
            options: {
              profile_params: { restrictions: restrictionsFromConfig(wheelchairConfig) },
            },
          },
        },
      };
    case 'walk':
      return {
        ok: true,
        request: { profile: 'foot-walking', body: { coordinates, instructions: false } },
      };
    case 'bike':
    case 'car':
    case 'transit':
      return { ok: false, reason: 'unsupported_mode' };
  }
}

export type OrsParseResult =
  | { ok: true; route: PlannedRoute }
  | { ok: false; reason: Exclude<OrsRouteFailure, 'unsupported_mode' | 'invalid_request_coordinates' | 'provider_unavailable'> };

interface OrsParseMeta {
  routeVersion: number;
  departureAtMs: number;
  provenance: RouteProvenance;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Parseur strict de la réponse Directions ORS en `geojson` :
 * FeatureCollection → features[0] → geometry LineString (≥ 2 points,
 * paires [longitude, latitude] validées WGS84) + properties.summary
 * {distance, duration} finis et positifs. Tout écart → rejet typé.
 */
export function parseOrsDirectionsGeoJson(payload: unknown, meta: OrsParseMeta): OrsParseResult {
  if (!isRecord(payload) || payload.type !== 'FeatureCollection') {
    return { ok: false, reason: 'invalid_payload' };
  }
  const features = payload.features;
  if (!Array.isArray(features) || features.length === 0) {
    return { ok: false, reason: 'no_route' };
  }
  const first: unknown = features[0];
  if (!isRecord(first)) return { ok: false, reason: 'invalid_payload' };

  const geometry = first.geometry;
  if (
    !isRecord(geometry) ||
    geometry.type !== 'LineString' ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2
  ) {
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

  const properties = first.properties;
  const summary = isRecord(properties) ? properties.summary : undefined;
  if (!isRecord(summary)) return { ok: false, reason: 'invalid_metrics' };
  const distanceMeters = summary.distance;
  const durationSeconds = summary.duration;
  if (
    typeof distanceMeters !== 'number' ||
    typeof durationSeconds !== 'number' ||
    !Number.isFinite(distanceMeters) ||
    !Number.isFinite(durationSeconds) ||
    distanceMeters < 0 ||
    durationSeconds < 0
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
 * Transport injecté : reçoit le profil et le corps de requête, retourne le
 * payload brut. Au volet 1, seuls des payloads de fixtures y transitent.
 */
export type OrsTransport = (request: OrsDirectionsRequest) => Promise<unknown>;

export interface OrsRouteProviderDeps {
  transport: OrsTransport;
  /** Versionnage de route et horodatage injectés — jamais Date.now() ici. */
  nextRouteVersion: () => number;
  nowMs: () => number;
  /** Configuration fauteuil versionnée (statut de validation conservé). */
  wheelchairConfig: WheelchairRoutingConfig;
  /** Version de configuration de routage portée par chaque provenance. */
  routingConfigVersion: number;
}

export function createOrsRouteProvider(deps: OrsRouteProviderDeps): RouteProviderPort {
  return {
    async planRoute(request: RouteRequest): Promise<PlannedRoute> {
      const built = buildOrsDirectionsRequest(request, deps.wheelchairConfig);
      if (!built.ok) {
        throw new OrsDirectionsError(built.reason);
      }

      let payload: unknown;
      try {
        payload = await deps.transport(built.request);
      } catch {
        // Indisponibilité du fournisseur : code seul, aucune donnée du trajet.
        throw new OrsDirectionsError('provider_unavailable');
      }

      const provenance: RouteProvenance = {
        providerId: ORS_PROVIDER_ID,
        profileId: built.request.profile,
        routingConfigVersion: deps.routingConfigVersion,
        accessibilityDataSource:
          built.request.profile === 'wheelchair' ? 'osm_via_ors' : 'none',
        validationStatus:
          built.request.profile === 'wheelchair'
            ? deps.wheelchairConfig.validationStatus
            : 'not_applicable',
        generatedAtMs: deps.nowMs(),
      };

      const parsed = parseOrsDirectionsGeoJson(payload, {
        routeVersion: deps.nextRouteVersion(),
        departureAtMs: deps.nowMs(),
        provenance,
      });
      if (!parsed.ok) {
        throw new OrsDirectionsError(parsed.reason);
      }
      return parsed.route;
    },
    evaluateDetours(
      _route: PlannedRoute,
      _candidates: readonly MerchantCandidate[],
      _nowMs: number,
    ): Promise<readonly RouteEvaluation[]> {
      // Matrix ORS : hors périmètre du Lot 2B volet 1 (Lot 3).
      return Promise.reject(new Error('ors_matrix_not_implemented_lot2b'));
    },
  };
}
