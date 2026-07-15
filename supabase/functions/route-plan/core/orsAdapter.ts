/**
 * Adaptateur ORS abstrait — LOT 3B.1 : fetch entièrement injecté/simulé.
 *
 * - Origine et chemins ORS = CONSTANTES SERVEUR, jamais des valeurs client ;
 * - la clé API est fournie par un provider injecté et transmise dans
 *   l'en-tête `Authorization` recommandé par ORS — jamais dans l'URL,
 *   jamais dans les logs (placeholder de test au 3B.1, secret réel au 3B.3) ;
 * - les corps ORS sont construits ICI depuis l'entrée validée + la
 *   configuration canonique (aucun paramètre client libre) ;
 * - contrôle de forme minimal des payloads avant transmission ; aucun corps
 *   d'erreur ORS brut n'est retourné ni journalisé ;
 * - 429 amont → code distinct `upstream_rate_limited`.
 */

import type { DirectionsInput, GeoPoint, MatrixInput } from './contracts.ts';
import type { ServerRoutingConfig } from './canonicalConfig.ts';

/** Constantes serveur — jamais dérivées d'une valeur client. */
export const ORS_ORIGIN = 'https://api.openrouteservice.org';

export function orsDirectionsPath(profile: string): string {
  return `/v2/directions/${profile}/geojson`;
}

export function orsMatrixPath(profile: string): string {
  return `/v2/matrix/${profile}`;
}

export interface UpstreamResponse {
  status: number;
  json(): Promise<unknown>;
}

export type UpstreamFetch = (
  url: string,
  init: { method: 'POST'; headers: Readonly<Record<string, string>>; body: string },
) => Promise<UpstreamResponse>;

export interface UpstreamDeps {
  fetchFn: UpstreamFetch;
  /** Clé API injectée — placeholder en test, secret Supabase au 3B.3. */
  apiKeyProvider: () => string;
}

function toLngLat(point: GeoPoint): [number, number] {
  return [point.longitude, point.latitude];
}

export function buildDirectionsBody(
  input: DirectionsInput,
  config: ServerRoutingConfig,
): Record<string, unknown> {
  const coordinates: [number, number][] = [toLngLat(input.origin)];
  if (input.waypoint !== undefined) coordinates.push(toLngLat(input.waypoint));
  coordinates.push(toLngLat(input.destination));

  const body: Record<string, unknown> = { coordinates, instructions: false };
  if (input.mode === 'wheelchair') {
    body.options = { profile_params: { restrictions: config.wheelchairRestrictions } };
  }
  return body;
}

/** Deux Matrix rectangulaires (paires exactes 2N+1), métriques fixées. */
export function buildMatrixBodies(input: MatrixInput): {
  bodyA: Record<string, unknown>;
  bodyB: Record<string, unknown>;
} {
  const candidateCoords = input.candidates.map(toLngLat);
  const n = candidateCoords.length;
  return {
    bodyA: {
      locations: [toLngLat(input.origin), toLngLat(input.destination), ...candidateCoords],
      sources: [0],
      destinations: Array.from({ length: n + 1 }, (_, i) => i + 1),
      metrics: ['duration', 'distance'],
    },
    bodyB: {
      locations: [...candidateCoords, toLngLat(input.destination)],
      sources: Array.from({ length: n }, (_, i) => i),
      destinations: [n],
      metrics: ['duration', 'distance'],
    },
  };
}

export type UpstreamFailure =
  | 'upstream_rate_limited'
  | 'upstream_unavailable'
  | 'upstream_invalid_response';

export type UpstreamResult =
  | { ok: true; payload: unknown }
  | { ok: false; code: UpstreamFailure };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Vérificateur de forme : reçoit AUSSI le corps de requête envoyé, pour en
 * dériver les dimensions/segments attendus. Serveur et client acceptent et
 * refusent les mêmes formes essentielles (défense en profondeur : cette
 * validation serveur PRÉCÈDE la validation client 3A, elle ne la remplace pas).
 */
export type PayloadShapeCheck = (
  payload: unknown,
  requestBody: Record<string, unknown>,
) => boolean;

/** Valeur numérique transmissible : nombre fini ≥ 0. */
function isFiniteNonNegative(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Cellule Matrix : `number` fini ≥ 0 ou `null` (paire non calculable). */
function isMatrixCell(value: unknown): boolean {
  return value === null || isFiniteNonNegative(value);
}

/** Grille rows × cols de cellules valides. */
function isMatrixGrid(value: unknown, rows: number, cols: number): boolean {
  if (!Array.isArray(value) || value.length !== rows) return false;
  return value.every(
    (row) => Array.isArray(row) && row.length === cols && row.every(isMatrixCell),
  );
}

/**
 * Payload Directions transmissible au parseur client 3A :
 * - aucune structure d'erreur amont déguisée en 200 ;
 * - FeatureCollection non vide, première feature valide ;
 * - geometry LineString ≥ 2 points ;
 * - properties.summary.duration ET .distance finies ≥ 0 ;
 * - trajet à waypoint (3 coordonnées demandées) : segments présents, un par
 *   tronçon, chacun avec une durée finie ≥ 0 (exigence du parseur fauteuil).
 */
export function directionsPayloadShapeOk(
  payload: unknown,
  requestBody: Record<string, unknown>,
): boolean {
  if (!isRecord(payload) || 'error' in payload) return false;
  if (payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) return false;
  if (payload.features.length === 0) return false;
  const first: unknown = payload.features[0];
  if (!isRecord(first)) return false;

  const geometry = first.geometry;
  if (
    !isRecord(geometry) ||
    geometry.type !== 'LineString' ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length < 2
  ) {
    return false;
  }

  const properties = first.properties;
  if (!isRecord(properties)) return false;
  const summary = properties.summary;
  if (!isRecord(summary)) return false;
  if (!isFiniteNonNegative(summary.duration) || !isFiniteNonNegative(summary.distance)) {
    return false;
  }

  const requestedCoordinates = requestBody.coordinates;
  const requestedPointCount = Array.isArray(requestedCoordinates)
    ? requestedCoordinates.length
    : 0;
  if (requestedPointCount >= 3) {
    const segments = properties.segments;
    if (!Array.isArray(segments) || segments.length !== requestedPointCount - 1) {
      return false;
    }
    if (!segments.every((segment) => isRecord(segment) && isFiniteNonNegative(segment.duration))) {
      return false;
    }
  }
  return true;
}

/**
 * Payload Matrix transmissible au parseur client 3A : `durations` ET
 * `distances` présents (les deux métriques sont toujours demandées),
 * dimensions exactement égales aux sources × destinations demandées,
 * cellules `number | null` finies ≥ 0, aucune structure d'erreur amont.
 */
export function matrixPayloadShapeOk(
  payload: unknown,
  requestBody: Record<string, unknown>,
): boolean {
  if (!isRecord(payload) || 'error' in payload) return false;
  const sources = requestBody.sources;
  const destinations = requestBody.destinations;
  if (!Array.isArray(sources) || !Array.isArray(destinations)) return false;
  const rows = sources.length;
  const cols = destinations.length;
  return isMatrixGrid(payload.durations, rows, cols) && isMatrixGrid(payload.distances, rows, cols);
}

/**
 * Appel amont : statut contrôlé, JSON contrôlé, forme contrôlée.
 * Le corps d'une erreur amont n'est JAMAIS lu ni propagé.
 */
export async function callUpstream(
  deps: UpstreamDeps,
  path: string,
  body: Record<string, unknown>,
  shapeOk: PayloadShapeCheck,
): Promise<UpstreamResult> {
  let response: UpstreamResponse;
  try {
    response = await deps.fetchFn(`${ORS_ORIGIN}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // En-tête recommandé par ORS — la clé ne va NI dans l'URL NI dans les logs.
        authorization: deps.apiKeyProvider(),
      },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, code: 'upstream_unavailable' };
  }

  if (response.status === 429) return { ok: false, code: 'upstream_rate_limited' };
  if (response.status !== 200) return { ok: false, code: 'upstream_unavailable' };

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, code: 'upstream_invalid_response' };
  }
  if (!shapeOk(payload, body)) return { ok: false, code: 'upstream_invalid_response' };
  return { ok: true, payload };
}
