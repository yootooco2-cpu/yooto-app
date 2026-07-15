/**
 * Planificateur de détours ORS — LOT 3A : ENTIÈREMENT HORS LIGNE.
 *
 * Construit et parse les requêtes abstraites d'évaluation de détour ;
 * aucun fetch, aucun AbortController, aucun timeout, aucun secret.
 *
 * FORMATS DE RÉPONSE FIXÉS (jamais un mélange implicite) :
 * - Matrix : JSON natif ORS (`durations`/`distances` : number[][]) ;
 * - Directions-waypoint : GeoJSON FeatureCollection avec
 *   `properties.summary` et `properties.segments[].duration/distance`.
 *
 * Stratégie par mode (décision GATE 3A) :
 * - marche : DEUX Matrix rectangulaires (paires exactes 2N+1) ;
 * - fauteuil : K × Directions-waypoint avec restrictions injectées ;
 *   AUCUNE Matrix fauteuil n'est opérationnelle au Lot 3A
 *   (`matrix_capability_incompatible`), aucun fallback walking.
 *
 * Détours impossibles : aucune valeur NaN/Infinity/négative n'atteint
 * RouteEvaluation ; un écart négatif dans la tolérance documentée est
 * ramené à 0 et COMPTÉ ; au-delà → invalid_metrics.
 */

import type { ProviderCapacity } from '../config';
import type {
  GeoPoint,
  MerchantCandidate,
  RouteEvaluation,
} from '../domain/types';
import { isValidGeoPoint } from '../geo/geometry';
import type { WheelchairRoutingConfig } from '../routingConfig';
import type { OrsWheelchairRestrictions } from './orsRouteProvider';

export type DetourEvaluationFailure =
  | 'matrix_capability_incompatible'
  | 'provider_capacity_exceeded'
  | 'invalid_request_coordinates'
  | 'invalid_payload'
  | 'missing_segment'
  | 'invalid_metrics'
  | 'stale_response';

/** Type réel de requête Matrix — sélectionne la limite de capacité. */
export type MatrixRequestKind = 'standard' | 'flexible';

/**
 * Garde de capacité : refuse toute construction dont le nombre de
 * routes/paires calculées dépasse la capacité déclarée du fournisseur.
 */
export function guardRoutesWithinCapacity(
  computedRoutes: number,
  kind: MatrixRequestKind,
  capacity: ProviderCapacity,
): boolean {
  const limit =
    kind === 'flexible'
      ? capacity.maxRoutesPerFlexibleRequest
      : capacity.maxRoutesPerStandardRequest;
  return computedRoutes <= limit;
}

/** Invariant points de jonction : les deux présents ou les deux absents. */
export function joinPointsCoherent(
  evaluation: Pick<RouteEvaluation, 'exitPoint' | 'rejoinPoint'>,
): boolean {
  return (evaluation.exitPoint === undefined) === (evaluation.rejoinPoint === undefined);
}

// ---------------------------------------------------------------------------
// MARCHE — deux Matrix rectangulaires (JSON natif ORS)
// ---------------------------------------------------------------------------

export interface OrsMatrixBody {
  /** Paires [longitude, latitude] — ordre GeoJSON/ORS. */
  locations: readonly (readonly [number, number])[];
  sources: readonly number[];
  destinations: readonly number[];
  metrics: readonly ('duration' | 'distance')[];
}

export interface OrsMatrixRequest {
  profile: 'foot-walking';
  body: OrsMatrixBody;
}

export interface WalkMatrixPlan {
  /** A : sources [origine] × destinations [destination, c1…cN] → N+1 paires. */
  requestA: OrsMatrixRequest;
  /** B : sources [c1…cN] × destinations [destination] → N paires. */
  requestB: OrsMatrixRequest;
  pairsA: number;
  pairsB: number;
  /** Ordre des candidats dans les deux requêtes (déterministe). */
  candidateIds: readonly string[];
  /** Candidats écartés par la borne maxMatrixCandidates. */
  truncatedCount: number;
}

export type WalkMatrixPlanResult =
  | { ok: true; plan: WalkMatrixPlan }
  | { ok: false; reason: 'provider_capacity_exceeded' | 'invalid_request_coordinates' };

function toLngLat(point: GeoPoint): readonly [number, number] {
  return [point.longitude, point.latitude];
}

export function buildWalkMatrixPlan(
  origin: GeoPoint,
  destination: GeoPoint,
  candidates: readonly MerchantCandidate[],
  options: { maxMatrixCandidates: number; capacity: ProviderCapacity },
): WalkMatrixPlanResult {
  if (!isValidGeoPoint(origin) || !isValidGeoPoint(destination)) {
    return { ok: false, reason: 'invalid_request_coordinates' };
  }
  const valid = candidates.filter((candidate) => isValidGeoPoint(candidate.position));
  const kept = valid.slice(0, Math.max(0, Math.floor(options.maxMatrixCandidates)));
  const n = kept.length;
  const pairsA = n + 1;
  const pairsB = n;

  // Matrix marche = requête STANDARD (aucun argument dynamique).
  if (
    !guardRoutesWithinCapacity(pairsA, 'standard', options.capacity) ||
    !guardRoutesWithinCapacity(pairsB, 'standard', options.capacity)
  ) {
    return { ok: false, reason: 'provider_capacity_exceeded' };
  }

  const candidateCoords = kept.map((candidate) => toLngLat(candidate.position));
  return {
    ok: true,
    plan: {
      requestA: {
        profile: 'foot-walking',
        body: {
          locations: [toLngLat(origin), toLngLat(destination), ...candidateCoords],
          sources: [0],
          destinations: Array.from({ length: n + 1 }, (_, i) => i + 1),
          metrics: ['duration', 'distance'],
        },
      },
      requestB: {
        profile: 'foot-walking',
        body: {
          locations: [...candidateCoords, toLngLat(destination)],
          sources: Array.from({ length: n }, (_, i) => i),
          destinations: [n],
          metrics: ['duration', 'distance'],
        },
      },
      pairsA,
      pairsB,
      candidateIds: kept.map((candidate) => candidate.merchantId),
      truncatedCount: valid.length - n,
    },
  };
}

export interface SkippedCandidate {
  merchantId: string;
  reason: 'missing_segment' | 'invalid_metrics';
}

export interface WalkMatrixMeta {
  candidateIds: readonly string[];
  routeVersion: number;
  departureAtMs: number;
  nowMs: number;
  toleranceSeconds: number;
  toleranceMeters: number;
}

export type WalkMatrixParseResult =
  | {
      ok: true;
      mainDurationSeconds: number;
      mainDistanceMeters: number;
      evaluations: readonly RouteEvaluation[];
      skipped: readonly SkippedCandidate[];
      /** Détours négatifs dans la tolérance ramenés à 0 — audités. */
      roundingClampedCount: number;
    }
  | { ok: false; reason: 'invalid_payload' | 'invalid_metrics' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Cellule matrice : null = injoignable (missing) ; nombre fini ≥ 0 sinon invalide. */
function readCell(value: unknown): { kind: 'value'; value: number } | { kind: 'missing' } | { kind: 'invalid' } {
  if (value === null) return { kind: 'missing' };
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return { kind: 'invalid' };
  }
  return { kind: 'value', value };
}

function readMatrixGrid(
  payload: unknown,
  key: 'durations' | 'distances',
  rows: number,
  cols: number,
): unknown[][] | null {
  if (!isRecord(payload)) return null;
  const grid = payload[key];
  if (!Array.isArray(grid) || grid.length !== rows) return null;
  for (const row of grid) {
    if (!Array.isArray(row) || row.length !== cols) return null;
  }
  return grid as unknown[][];
}

/**
 * Combine les réponses des Matrix A et B en évaluations. Une durée
 * manquante ou invalide pour un candidat écarte CE candidat (audité) ;
 * une durée origine→destination inexploitable invalide tout le résultat.
 */
export function parseWalkMatrixResponses(
  payloadA: unknown,
  payloadB: unknown,
  meta: WalkMatrixMeta,
): WalkMatrixParseResult {
  const n = meta.candidateIds.length;
  const durationsA = readMatrixGrid(payloadA, 'durations', 1, n + 1);
  const distancesA = readMatrixGrid(payloadA, 'distances', 1, n + 1);
  const durationsB = readMatrixGrid(payloadB, 'durations', n, 1);
  const distancesB = readMatrixGrid(payloadB, 'distances', n, 1);
  if (durationsA === null || distancesA === null || durationsB === null || distancesB === null) {
    return { ok: false, reason: 'invalid_payload' };
  }

  const mainDuration = readCell(durationsA[0][0]);
  const mainDistance = readCell(distancesA[0][0]);
  if (mainDuration.kind !== 'value' || mainDistance.kind !== 'value') {
    return { ok: false, reason: 'invalid_metrics' };
  }

  const evaluations: RouteEvaluation[] = [];
  const skipped: SkippedCandidate[] = [];
  let roundingClampedCount = 0;

  for (let i = 0; i < n; i += 1) {
    const merchantId = meta.candidateIds[i];
    const toMerchant = readCell(durationsA[0][i + 1]);
    const fromMerchant = readCell(durationsB[i][0]);
    const toMerchantDist = readCell(distancesA[0][i + 1]);
    const fromMerchantDist = readCell(distancesB[i][0]);

    const cells = [toMerchant, fromMerchant, toMerchantDist, fromMerchantDist];
    if (cells.some((cell) => cell.kind === 'missing')) {
      skipped.push({ merchantId, reason: 'missing_segment' });
      continue;
    }
    if (cells.some((cell) => cell.kind === 'invalid')) {
      skipped.push({ merchantId, reason: 'invalid_metrics' });
      continue;
    }
    const toS = (toMerchant as { value: number }).value;
    const fromS = (fromMerchant as { value: number }).value;
    const toM = (toMerchantDist as { value: number }).value;
    const fromM = (fromMerchantDist as { value: number }).value;

    let detourSeconds = toS + fromS - mainDuration.value;
    let detourMeters = toM + fromM - mainDistance.value;
    if (detourSeconds < -meta.toleranceSeconds || detourMeters < -meta.toleranceMeters) {
      skipped.push({ merchantId, reason: 'invalid_metrics' });
      continue;
    }
    if (detourSeconds < 0 || detourMeters < 0) {
      // Écart négatif dû à l'arrondi, dans la tolérance : ramené à 0, audité.
      detourSeconds = Math.max(0, detourSeconds);
      detourMeters = Math.max(0, detourMeters);
      roundingClampedCount += 1;
    }

    evaluations.push({
      merchantId,
      routeVersion: meta.routeVersion,
      etaAtMerchantMs: meta.departureAtMs + toS * 1000,
      detourSeconds,
      detourMeters,
      computedAtMs: meta.nowMs,
      // exitPoint/rejoinPoint : jamais fabriqués — absents tous les deux.
    });
  }

  return {
    ok: true,
    mainDurationSeconds: mainDuration.value,
    mainDistanceMeters: mainDistance.value,
    evaluations,
    skipped,
    roundingClampedCount,
  };
}

// ---------------------------------------------------------------------------
// FAUTEUIL — K × Directions-waypoint (GeoJSON), restrictions injectées
// ---------------------------------------------------------------------------

export interface OrsWaypointDirectionsRequest {
  profile: 'wheelchair';
  body: {
    /** [origine, candidat, destination] en [longitude, latitude]. */
    coordinates: readonly (readonly [number, number])[];
    instructions: false;
    options: { profile_params: { restrictions: OrsWheelchairRestrictions } };
  };
}

export interface WheelchairWaypointPlan {
  requests: readonly OrsWaypointDirectionsRequest[];
  candidateIds: readonly string[];
  truncatedCount: number;
}

export type WheelchairWaypointPlanResult =
  | { ok: true; plan: WheelchairWaypointPlan }
  | { ok: false; reason: 'invalid_request_coordinates' };

// Même mapping que le fournisseur Directions — dupliqué localement car
// orsRouteProvider.ts est hors du périmètre autorisé de ce lot.
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

export function buildWheelchairWaypointPlan(
  origin: GeoPoint,
  destination: GeoPoint,
  candidates: readonly MerchantCandidate[],
  wheelchairConfig: WheelchairRoutingConfig,
  options: { maxCandidates: number },
): WheelchairWaypointPlanResult {
  if (!isValidGeoPoint(origin) || !isValidGeoPoint(destination)) {
    return { ok: false, reason: 'invalid_request_coordinates' };
  }
  const valid = candidates.filter((candidate) => isValidGeoPoint(candidate.position));
  const kept = valid.slice(0, Math.max(0, Math.floor(options.maxCandidates)));
  const restrictions = restrictionsFromConfig(wheelchairConfig);

  return {
    ok: true,
    plan: {
      requests: kept.map((candidate) => ({
        profile: 'wheelchair' as const,
        body: {
          coordinates: [toLngLat(origin), toLngLat(candidate.position), toLngLat(destination)],
          instructions: false as const,
          options: { profile_params: { restrictions } },
        },
      })),
      candidateIds: kept.map((candidate) => candidate.merchantId),
      truncatedCount: valid.length - kept.length,
    },
  };
}

/**
 * Matrix fauteuil : AUCUNE capacité opérationnelle au Lot 3A. La Matrix
 * standard n'applique pas profile_params ; l'éventuel mode flexible reste
 * expérimental et sera vérifié au Lot 3C. Résultat typé, sans fallback
 * walking et sans faux niveau de confiance.
 */
export function planWheelchairMatrix(): { ok: false; reason: 'matrix_capability_incompatible' } {
  return { ok: false, reason: 'matrix_capability_incompatible' };
}

export interface WheelchairWaypointMeta {
  merchantId: string;
  routeVersion: number;
  /** Durée/distance de la route PRINCIPALE de la session (même graphe). */
  mainDurationSeconds: number;
  mainDistanceMeters: number;
  departureAtMs: number;
  nowMs: number;
  toleranceSeconds: number;
  toleranceMeters: number;
}

export type WheelchairWaypointParseResult =
  | {
      ok: true;
      evaluation: RouteEvaluation;
      totalTripSeconds: number;
      toMerchantSeconds: number;
      /** true si un écart négatif dans la tolérance a été ramené à 0. */
      roundingClamped: boolean;
    }
  | { ok: false; reason: 'invalid_payload' | 'missing_segment' | 'invalid_metrics' };

function readFiniteNonNegative(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * Parse UNE réponse Directions-waypoint (GeoJSON) fauteuil.
 * Exige distinctement : summary.duration/distance (trajet total) ET
 * segments[0].duration (origine→commerce, base de l'ETA) + segments[1]
 * (commerce→destination). Aucun segment manquant n'est reconstruit.
 */
export function parseWheelchairWaypointResponse(
  payload: unknown,
  meta: WheelchairWaypointMeta,
): WheelchairWaypointParseResult {
  if (!isRecord(payload) || payload.type !== 'FeatureCollection' || !Array.isArray(payload.features)) {
    return { ok: false, reason: 'invalid_payload' };
  }
  if (payload.features.length === 0) return { ok: false, reason: 'invalid_payload' };
  const first: unknown = payload.features[0];
  if (!isRecord(first) || !isRecord(first.properties)) {
    return { ok: false, reason: 'invalid_payload' };
  }
  const { properties } = first as { properties: Record<string, unknown> };

  const segments = properties.segments;
  if (!Array.isArray(segments) || segments.length !== 2) {
    return { ok: false, reason: 'missing_segment' };
  }
  const [seg0, seg1] = segments as [unknown, unknown];
  if (!isRecord(seg0) || !isRecord(seg1)) return { ok: false, reason: 'missing_segment' };

  const summary = properties.summary;
  if (!isRecord(summary)) return { ok: false, reason: 'invalid_payload' };

  const totalTripSeconds = readFiniteNonNegative(summary.duration);
  const totalTripMeters = readFiniteNonNegative(summary.distance);
  const toMerchantSeconds = readFiniteNonNegative(seg0.duration);
  const fromMerchantSeconds = readFiniteNonNegative(seg1.duration);
  if (toMerchantSeconds === null || fromMerchantSeconds === null) {
    return { ok: false, reason: 'missing_segment' };
  }
  if (totalTripSeconds === null || totalTripMeters === null) {
    return { ok: false, reason: 'invalid_metrics' };
  }

  let detourSeconds = totalTripSeconds - meta.mainDurationSeconds;
  let detourMeters = totalTripMeters - meta.mainDistanceMeters;
  if (detourSeconds < -meta.toleranceSeconds || detourMeters < -meta.toleranceMeters) {
    return { ok: false, reason: 'invalid_metrics' };
  }
  const roundingClamped = detourSeconds < 0 || detourMeters < 0;
  detourSeconds = Math.max(0, detourSeconds);
  detourMeters = Math.max(0, detourMeters);

  return {
    ok: true,
    evaluation: {
      merchantId: meta.merchantId,
      routeVersion: meta.routeVersion,
      etaAtMerchantMs: meta.departureAtMs + toMerchantSeconds * 1000,
      detourSeconds,
      detourMeters,
      computedAtMs: meta.nowMs,
      // exitPoint/rejoinPoint : jamais fabriqués — absents tous les deux.
    },
    totalTripSeconds,
    toMerchantSeconds,
    roundingClamped,
  };
}
