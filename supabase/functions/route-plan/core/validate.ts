/**
 * Validation stricte de la requête `route-plan` — ordre fixe, arrêt au
 * premier échec, résultats typés, jamais de coordonnées dans les erreurs.
 *
 * - POST uniquement ;
 * - Content-Type JSON accepté avec paramètres MIME et casse indifférente ;
 * - taille du corps mesurée en OCTETS UTF-8 réels (jamais Content-Length) ;
 * - schéma par LISTE BLANCHE de clés, récursif : tout champ inconnu à
 *   n'importe quel niveau est refusé ;
 * - profils dérivés du mode, jamais fournis librement ;
 * - binding comparé à la configuration canonique serveur.
 */

import type {
  DirectionsInput,
  ExpectedBinding,
  GeoPoint,
  MatrixInput,
  RawHttpRequest,
  RoutePlanInput,
} from './contracts.ts';
import type { RoutePlanErrorCode } from './errors.ts';
import type { ServerRoutingConfig } from './canonicalConfig.ts';
import type { PilotZone } from './geofence.ts';
import { isInPilotZone } from './geofence.ts';

export interface ValidationLimits {
  maxBodyBytes: number;
  maxMatrixCandidates: number;
}

export type ValidationResult =
  | { ok: true; input: RoutePlanInput }
  | { ok: false; code: RoutePlanErrorCode };

function fail(code: RoutePlanErrorCode): ValidationResult {
  return { ok: false, code };
}

/** JSON accepté avec paramètres MIME (charset…) et casse indifférente. */
export function isJsonContentType(contentType: string | undefined): boolean {
  if (contentType === undefined) return false;
  const essence = contentType.split(';')[0].trim().toLowerCase();
  return essence === 'application/json';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Refus récursif de toute clé hors liste blanche. */
function hasOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(record).every((key) => allowed.includes(key));
}

const GEO_POINT_KEYS = ['latitude', 'longitude'] as const;
const BINDING_KEYS = ['providerId', 'profileId', 'routingConfigVersion'] as const;
const DIRECTIONS_KEYS = ['action', 'mode', 'expectedBinding', 'origin', 'destination', 'waypoint'] as const;
const MATRIX_KEYS = ['action', 'mode', 'expectedBinding', 'origin', 'destination', 'candidates'] as const;

type PointCheck =
  | { ok: true; point: GeoPoint }
  | { ok: false; code: 'unknown_field' | 'invalid_input' | 'invalid_coordinates' };

function checkGeoPoint(value: unknown): PointCheck {
  if (!isRecord(value)) return { ok: false, code: 'invalid_input' };
  if (!hasOnlyKeys(value, GEO_POINT_KEYS)) return { ok: false, code: 'unknown_field' };
  const { latitude, longitude } = value;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { ok: false, code: 'invalid_input' };
  }
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180 ||
    (latitude === 0 && longitude === 0)
  ) {
    return { ok: false, code: 'invalid_coordinates' };
  }
  return { ok: true, point: { latitude, longitude } };
}

type BindingCheckResult =
  | { ok: true; binding: ExpectedBinding }
  | { ok: false; code: 'unknown_field' | 'invalid_input' };

function checkBinding(value: unknown): BindingCheckResult {
  if (!isRecord(value)) return { ok: false, code: 'invalid_input' };
  if (!hasOnlyKeys(value, BINDING_KEYS)) return { ok: false, code: 'unknown_field' };
  const { providerId, profileId, routingConfigVersion } = value;
  if (
    typeof providerId !== 'string' ||
    typeof profileId !== 'string' ||
    typeof routingConfigVersion !== 'number' ||
    !Number.isFinite(routingConfigVersion)
  ) {
    return { ok: false, code: 'invalid_input' };
  }
  return { ok: true, binding: { providerId, profileId, routingConfigVersion } };
}

export function validateRoutePlanRequest(
  raw: RawHttpRequest,
  config: ServerRoutingConfig,
  zone: PilotZone,
  limits: ValidationLimits,
): ValidationResult {
  // 1. Méthode.
  if (raw.method !== 'POST') return fail('method_not_allowed');

  // 2. Content-Type (casse et paramètres MIME tolérés).
  if (!isJsonContentType(raw.headers['content-type'])) {
    return fail('unsupported_media_type');
  }

  // 3. Taille : octets UTF-8 réels du corps, jamais un Content-Length client.
  if (new TextEncoder().encode(raw.bodyText).length > limits.maxBodyBytes) {
    return fail('body_too_large');
  }

  // 4. JSON.
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.bodyText);
  } catch {
    return fail('invalid_json');
  }
  if (!isRecord(parsed)) return fail('invalid_input');

  // 5. Action + schéma strict récursif.
  const action = parsed.action;
  if (action !== 'directions' && action !== 'matrix') return fail('invalid_input');

  const rootKeys = action === 'directions' ? DIRECTIONS_KEYS : MATRIX_KEYS;
  if (!hasOnlyKeys(parsed, rootKeys)) return fail('unknown_field');

  const mode = parsed.mode;
  if (mode !== 'wheelchair' && mode !== 'walk') return fail('invalid_input');

  // Matrix fauteuil : capacité non disponible — refus typé, sans fallback.
  if (action === 'matrix' && mode === 'wheelchair') {
    return fail('matrix_capability_incompatible');
  }

  const bindingCheck = checkBinding(parsed.expectedBinding);
  if (!bindingCheck.ok) return fail(bindingCheck.code);

  const originCheck = checkGeoPoint(parsed.origin);
  if (!originCheck.ok) return fail(originCheck.code);
  const destinationCheck = checkGeoPoint(parsed.destination);
  if (!destinationCheck.ok) return fail(destinationCheck.code);

  const points: GeoPoint[] = [originCheck.point, destinationCheck.point];
  let waypoint: GeoPoint | undefined;
  const candidates: GeoPoint[] = [];

  if (action === 'directions') {
    if (parsed.waypoint !== undefined) {
      const waypointCheck = checkGeoPoint(parsed.waypoint);
      if (!waypointCheck.ok) return fail(waypointCheck.code);
      waypoint = waypointCheck.point;
      points.push(waypoint);
    }
  } else {
    if (!Array.isArray(parsed.candidates)) return fail('invalid_input');
    if (parsed.candidates.length > limits.maxMatrixCandidates) {
      return fail('too_many_candidates');
    }
    for (const rawCandidate of parsed.candidates) {
      const candidateCheck = checkGeoPoint(rawCandidate);
      if (!candidateCheck.ok) return fail(candidateCheck.code);
      candidates.push(candidateCheck.point);
      points.push(candidateCheck.point);
    }
  }

  // 6. Géorestriction pilote : chaque point dans la zone explicite.
  for (const point of points) {
    if (!isInPilotZone(point, zone)) return fail('out_of_pilot_area');
  }

  // 7. Binding vs configuration canonique serveur.
  const { binding } = bindingCheck;
  const expectedProfile = config.profiles[mode];
  if (binding.profileId !== 'wheelchair' && binding.profileId !== 'foot-walking') {
    return fail('unsupported_profile');
  }
  if (
    binding.providerId !== 'ors' ||
    binding.profileId !== expectedProfile ||
    binding.routingConfigVersion !== config.version
  ) {
    return fail('binding_mismatch');
  }

  if (action === 'directions') {
    const input: DirectionsInput = {
      action: 'directions',
      mode,
      expectedBinding: binding,
      origin: originCheck.point,
      destination: destinationCheck.point,
      ...(waypoint !== undefined ? { waypoint } : {}),
    };
    return { ok: true, input };
  }
  const input: MatrixInput = {
    action: 'matrix',
    mode: 'walk',
    expectedBinding: binding,
    origin: originCheck.point,
    destination: destinationCheck.point,
    candidates,
  };
  return { ok: true, input };
}
