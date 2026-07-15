/**
 * Tests du planificateur de détours : formules de paires exactes, garde de
 * capacité, parseurs Matrix (JSON) et Directions-waypoint (GeoJSON),
 * tolérance d'arrondi auditée, aucune valeur invalide dans RouteEvaluation,
 * aucune Matrix fauteuil, aucun fallback walking, déterminisme.
 */

import { DEFAULT_ORS_CAPACITY } from '../config';
import { FIXED_NOW_MS, makeCandidate } from '../fixtures';
import { offsetNorthMeters, POINT_ON_ROUTE } from '../fixtures/corridorFixtures';
import { ORS_DOCUMENTED_DEFAULTS_UNVALIDATED } from '../routingConfig';
import {
  buildWalkMatrixPlan,
  buildWheelchairWaypointPlan,
  guardRoutesWithinCapacity,
  joinPointsCoherent,
  parseWalkMatrixResponses,
  parseWheelchairWaypointResponse,
  planWheelchairMatrix,
} from './orsDetourPlanner';

const ORIGIN = { latitude: 43.6086, longitude: 3.8797 };
const DESTINATION = { latitude: 43.6128, longitude: 3.8655 };

function candidates(count: number) {
  return Array.from({ length: count }, (_, i) =>
    makeCandidate({
      merchantId: `c-${String(i).padStart(2, '0')}`,
      position: offsetNorthMeters(POINT_ON_ROUTE, 10 + i),
    }),
  );
}

describe('guardRoutesWithinCapacity', () => {
  it('sélectionne la limite selon le type réel de requête', () => {
    expect(guardRoutesWithinCapacity(25, 'flexible', DEFAULT_ORS_CAPACITY)).toBe(true);
    expect(guardRoutesWithinCapacity(26, 'flexible', DEFAULT_ORS_CAPACITY)).toBe(false);
    expect(guardRoutesWithinCapacity(3500, 'standard', DEFAULT_ORS_CAPACITY)).toBe(true);
    expect(guardRoutesWithinCapacity(3501, 'standard', DEFAULT_ORS_CAPACITY)).toBe(false);
  });
});

describe('joinPointsCoherent — invariant des points de jonction', () => {
  const point = { latitude: 43.61, longitude: 3.87 };
  it('accepte les deux présents ou les deux absents ; refuse un seul point', () => {
    expect(joinPointsCoherent({})).toBe(true);
    expect(joinPointsCoherent({ exitPoint: point, rejoinPoint: point })).toBe(true);
    expect(joinPointsCoherent({ exitPoint: point })).toBe(false);
    expect(joinPointsCoherent({ rejoinPoint: point })).toBe(false);
  });
});

describe('buildWalkMatrixPlan — formule 2N+1', () => {
  const options = { maxMatrixCandidates: 20, capacity: DEFAULT_ORS_CAPACITY };

  it('N=20 : requête A = 21 paires, requête B = 20 paires, profils foot-walking', () => {
    const result = buildWalkMatrixPlan(ORIGIN, DESTINATION, candidates(20), options);
    if (!result.ok) throw new Error('plan attendu');
    const { plan } = result;
    expect(plan.pairsA).toBe(21);
    expect(plan.pairsB).toBe(20);
    expect(plan.requestA.body.sources).toEqual([0]);
    expect(plan.requestA.body.destinations).toHaveLength(21);
    expect(plan.requestA.body.locations).toHaveLength(22);
    expect(plan.requestB.body.sources).toHaveLength(20);
    expect(plan.requestB.body.destinations).toEqual([20]);
    expect(plan.requestA.profile).toBe('foot-walking');
    // Ordre [longitude, latitude] vérifié sur l'origine.
    expect(plan.requestA.body.locations[0]).toEqual([3.8797, 43.6086]);
    expect(plan.requestA.body.metrics).toEqual(['duration', 'distance']);
    expect(plan.truncatedCount).toBe(0);
  });

  it('tronque de façon déterministe au-delà de maxMatrixCandidates et l’audite', () => {
    const result = buildWalkMatrixPlan(ORIGIN, DESTINATION, candidates(30), options);
    if (!result.ok) throw new Error('plan attendu');
    expect(result.plan.candidateIds).toHaveLength(20);
    expect(result.plan.candidateIds[0]).toBe('c-00');
    expect(result.plan.truncatedCount).toBe(10);
  });

  it('refuse AVANT construction une requête dépassant la capacité déclarée', () => {
    const tinyCapacity = { maxRoutesPerFlexibleRequest: 25, maxRoutesPerStandardRequest: 15 };
    const result = buildWalkMatrixPlan(ORIGIN, DESTINATION, candidates(20), {
      maxMatrixCandidates: 20,
      capacity: tinyCapacity,
    });
    expect(result).toEqual({ ok: false, reason: 'provider_capacity_exceeded' });
  });

  it('rejette des coordonnées de requête invalides', () => {
    const result = buildWalkMatrixPlan(
      { latitude: 0, longitude: 0 },
      DESTINATION,
      candidates(3),
      options,
    );
    expect(result).toEqual({ ok: false, reason: 'invalid_request_coordinates' });
  });

  it('est déterministe', () => {
    const a = buildWalkMatrixPlan(ORIGIN, DESTINATION, candidates(5), options);
    const b = buildWalkMatrixPlan(ORIGIN, DESTINATION, candidates(5), options);
    expect(a).toEqual(b);
  });
});

describe('parseWalkMatrixResponses', () => {
  const meta = {
    candidateIds: ['c-00', 'c-01', 'c-02'],
    routeVersion: 1,
    departureAtMs: FIXED_NOW_MS,
    nowMs: FIXED_NOW_MS,
    toleranceSeconds: 1,
    toleranceMeters: 15,
  };
  // A : 1 × 4 [o→d, o→c0, o→c1, o→c2] ; B : 3 × 1 [ci→d].
  const payloadA = {
    durations: [[1000, 400, 500, 600]],
    distances: [[1300, 500, 650, 800]],
  };
  // c-00 : 400+700−1000 = 100 s · c-01 : 500+520−1000 = 20 s ·
  // c-02 : 600+450−1000 = 50 s — tous les détours sont positifs.
  const payloadB = {
    durations: [[700], [520], [450]],
    distances: [[900], [680], [520]],
  };

  it('calcule détour et ETA par candidat, sans points de jonction fabriqués', () => {
    const result = parseWalkMatrixResponses(payloadA, payloadB, meta);
    if (!result.ok) throw new Error('résultat attendu');
    expect(result.mainDurationSeconds).toBe(1000);
    expect(result.evaluations).toHaveLength(3);
    const [e0] = result.evaluations;
    expect(e0.detourSeconds).toBe(400 + 700 - 1000);
    expect(e0.detourMeters).toBe(500 + 900 - 1300);
    expect(e0.etaAtMerchantMs).toBe(FIXED_NOW_MS + 400_000);
    expect(e0.exitPoint).toBeUndefined();
    expect(e0.rejoinPoint).toBeUndefined();
    expect(joinPointsCoherent(e0)).toBe(true);
    // Aucune valeur invalide n'atteint RouteEvaluation.
    for (const e of result.evaluations) {
      expect(Number.isFinite(e.detourSeconds)).toBe(true);
      expect(e.detourSeconds).toBeGreaterThanOrEqual(0);
      expect(e.detourMeters).toBeGreaterThanOrEqual(0);
    }
  });

  it('durée manquante (null) → missing_segment pour CE candidat uniquement', () => {
    const result = parseWalkMatrixResponses(
      { durations: [[1000, 400, null, 600]], distances: payloadA.distances },
      payloadB,
      meta,
    );
    if (!result.ok) throw new Error('résultat attendu');
    expect(result.evaluations.map((e) => e.merchantId)).toEqual(['c-00', 'c-02']);
    expect(result.skipped).toEqual([{ merchantId: 'c-01', reason: 'missing_segment' }]);
  });

  it('durée négative ou non finie → invalid_metrics pour ce candidat', () => {
    const result = parseWalkMatrixResponses(
      { durations: [[1000, -5, 500, Number.NaN]], distances: payloadA.distances },
      payloadB,
      meta,
    );
    if (!result.ok) throw new Error('résultat attendu');
    expect(result.skipped).toEqual([
      { merchantId: 'c-00', reason: 'invalid_metrics' },
      { merchantId: 'c-02', reason: 'invalid_metrics' },
    ]);
  });

  it('origine→destination inexploitable → résultat globalement invalid_metrics', () => {
    expect(
      parseWalkMatrixResponses(
        { durations: [[null, 400, 500, 600]], distances: payloadA.distances },
        payloadB,
        meta,
      ),
    ).toEqual({ ok: false, reason: 'invalid_metrics' });
  });

  it('détour total inférieur au principal au-delà de la tolérance → candidat écarté', () => {
    const result = parseWalkMatrixResponses(
      { durations: [[1000, 100, 500, 600]], distances: payloadA.distances },
      { durations: [[10], [520], [380]], distances: payloadB.distances },
      meta,
    ); // c-00 : 100+10-1000 = -890 ≪ -tolérance
    if (!result.ok) throw new Error('résultat attendu');
    expect(result.skipped).toContainEqual({ merchantId: 'c-00', reason: 'invalid_metrics' });
  });

  it('écart négatif dans la tolérance → ramené à 0 ET compté', () => {
    const result = parseWalkMatrixResponses(
      { durations: [[1000, 400, 500, 600]], distances: [[1300, 500, 650, 800]] },
      {
        durations: [[599.5], [520], [380]], // c-00 : 400+599.5-1000 = -0.5 ∈ ]-1, 0[
        distances: [[795], [680], [480]], // c-00 : 500+795-1300 = -5 ∈ ]-15, 0[
      },
      meta,
    );
    if (!result.ok) throw new Error('résultat attendu');
    const e0 = result.evaluations.find((e) => e.merchantId === 'c-00');
    expect(e0?.detourSeconds).toBe(0);
    expect(e0?.detourMeters).toBe(0);
    expect(result.roundingClampedCount).toBe(1);
  });

  it('payload aux dimensions inattendues → invalid_payload', () => {
    expect(parseWalkMatrixResponses({ durations: [[1, 2]] }, payloadB, meta)).toEqual({
      ok: false,
      reason: 'invalid_payload',
    });
    expect(parseWalkMatrixResponses(null, payloadB, meta)).toEqual({
      ok: false,
      reason: 'invalid_payload',
    });
  });
});

describe('fauteuil — plan Directions-waypoint et interdictions', () => {
  it('construit au plus K requêtes wheelchair avec restrictions injectées', () => {
    const result = buildWheelchairWaypointPlan(
      ORIGIN,
      DESTINATION,
      candidates(8),
      ORS_DOCUMENTED_DEFAULTS_UNVALIDATED,
      { maxCandidates: 5 },
    );
    if (!result.ok) throw new Error('plan attendu');
    expect(result.plan.requests).toHaveLength(5);
    expect(result.plan.truncatedCount).toBe(3);
    const first = result.plan.requests[0];
    expect(first.profile).toBe('wheelchair');
    expect(first.body.coordinates).toHaveLength(3);
    expect(first.body.options.profile_params.restrictions.maximum_incline).toBe(6);
    // AUCUN fallback walking : aucune trace de foot-walking dans le plan.
    expect(JSON.stringify(result.plan)).not.toContain('foot-walking');
  });

  it('aucune Matrix fauteuil n’est opérationnelle au Lot 3A', () => {
    expect(planWheelchairMatrix()).toEqual({
      ok: false,
      reason: 'matrix_capability_incompatible',
    });
  });
});

describe('parseWheelchairWaypointResponse', () => {
  const meta = {
    merchantId: 'toilet-accessible',
    routeVersion: 1,
    mainDurationSeconds: 1560,
    mainDistanceMeters: 1820,
    departureAtMs: FIXED_NOW_MS,
    nowMs: FIXED_NOW_MS,
    toleranceSeconds: 1,
    toleranceMeters: 15,
  };

  function waypointPayload(
    summary: unknown = { duration: 1800, distance: 2100 },
    segments: unknown = [
      { duration: 700, distance: 800 },
      { duration: 1100, distance: 1300 },
    ],
  ): unknown {
    return {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { summary, segments }, geometry: {} }],
    };
  }

  it('extrait distinctement durée totale, premier segment (ETA) et détour', () => {
    const result = parseWheelchairWaypointResponse(waypointPayload(), meta);
    if (!result.ok) throw new Error('résultat attendu');
    expect(result.totalTripSeconds).toBe(1800);
    expect(result.toMerchantSeconds).toBe(700);
    expect(result.evaluation.detourSeconds).toBe(1800 - 1560);
    expect(result.evaluation.detourMeters).toBe(2100 - 1820);
    expect(result.evaluation.etaAtMerchantMs).toBe(FIXED_NOW_MS + 700_000);
    expect(result.evaluation.exitPoint).toBeUndefined();
    expect(result.evaluation.rejoinPoint).toBeUndefined();
    expect(result.roundingClamped).toBe(false);
  });

  it('segment manquant → missing_segment, jamais reconstruit', () => {
    expect(
      parseWheelchairWaypointResponse(
        waypointPayload({ duration: 1800, distance: 2100 }, [{ duration: 700, distance: 800 }]),
        meta,
      ),
    ).toEqual({ ok: false, reason: 'missing_segment' });
    expect(
      parseWheelchairWaypointResponse(
        waypointPayload({ duration: 1800, distance: 2100 }, [
          { distance: 800 },
          { duration: 1100, distance: 1300 },
        ]),
        meta,
      ),
    ).toEqual({ ok: false, reason: 'missing_segment' });
  });

  it('durée totale négative, non finie ou incohérente → invalid_metrics', () => {
    expect(
      parseWheelchairWaypointResponse(
        waypointPayload({ duration: -1, distance: 2100 }),
        meta,
      ),
    ).toEqual({ ok: false, reason: 'invalid_metrics' });
    // Total nettement inférieur à la route principale (au-delà de la tolérance).
    expect(
      parseWheelchairWaypointResponse(
        waypointPayload({ duration: 900, distance: 2100 }),
        meta,
      ),
    ).toEqual({ ok: false, reason: 'invalid_metrics' });
  });

  it('écart négatif dans la tolérance → 0, signalé roundingClamped', () => {
    const result = parseWheelchairWaypointResponse(
      waypointPayload({ duration: 1559.5, distance: 1810 }),
      meta,
    );
    if (!result.ok) throw new Error('résultat attendu');
    expect(result.evaluation.detourSeconds).toBe(0);
    expect(result.evaluation.detourMeters).toBe(0);
    expect(result.roundingClamped).toBe(true);
  });

  it('payload non GeoJSON → invalid_payload', () => {
    expect(parseWheelchairWaypointResponse({ routes: [] }, meta)).toEqual({
      ok: false,
      reason: 'invalid_payload',
    });
  });
});
