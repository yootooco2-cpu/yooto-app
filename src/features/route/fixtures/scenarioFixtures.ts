/**
 * Fixtures de scénario pour le pilote SIMULÉ Comédie → Arceaux (Lot 2C).
 *
 * Fournisseur scripté déterministe : il rejoue des routes injectées et
 * fabrique des évaluations de détour à partir d'une table fixe — aucun
 * calcul de détour dans le domaine, aucun réseau, aucun aléa. Les appels
 * reçus sont enregistrés pour prouver, par assertion, qu'aucune tentative
 * de fallback (ex. fauteuil → piéton) n'a lieu.
 */

import type {
  MerchantCandidate,
  RouteEvaluation,
  RouteProvenance,
  TransportMode,
} from '../domain/types';
import type { PlannedRoute, RouteProviderPort, RouteRequest } from '../ports';
import type { WheelchairValidationStatus } from '../routingConfig';
import { FIXED_NOW_MS, makeCandidate, SIMULATED_ROUTE_COMEDIE_ARCEAUX, TEST_CATEGORY_IDS } from './index';
import { offsetNorthMeters, POINT_ON_ROUTE } from './corridorFixtures';

/** Provenance ORS simulée, alignée sur le binding du pilote. */
export function orsScenarioProvenance(
  mode: TransportMode,
  routingConfigVersion: number,
  validationStatus: WheelchairValidationStatus = 'unvalidated',
): RouteProvenance {
  const wheelchair = mode === 'wheelchair';
  return {
    providerId: 'ors',
    profileId: wheelchair ? 'wheelchair' : 'foot-walking',
    routingConfigVersion,
    accessibilityDataSource: wheelchair ? 'osm_via_ors' : 'none',
    validationStatus: wheelchair ? validationStatus : 'not_applicable',
    generatedAtMs: FIXED_NOW_MS,
  };
}

/** Route ORS simulée (géométrie Comédie → Arceaux), version paramétrable. */
export function makeOrsScenarioRoute(
  mode: TransportMode,
  routeVersion: number,
  routingConfigVersion = 1,
): PlannedRoute {
  return {
    ...SIMULATED_ROUTE_COMEDIE_ARCEAUX,
    routeVersion,
    provenance: orsScenarioProvenance(mode, routingConfigVersion),
  };
}

/** Détours scriptés (secondes) par commerce — table fixe et déterministe. */
export const SCENARIO_DETOUR_SECONDS: Readonly<Record<string, number>> = {
  'toilet-accessible': 120,
  'toilet-accessible-2': 240,
  'toilet-unknown-access': 90,
  'bakery-on-route': 60,
  'bakery-hours-unknown': 100,
  'cafe-closed': 80,
};

/** Candidats du scénario pilote, tous dans le corridor fauteuil (150 m). */
export function makeScenarioCandidates(): MerchantCandidate[] {
  return [
    // Toilettes accessibles VÉRIFIÉES (donnée marchande, pas la route).
    makeCandidate({
      merchantId: 'toilet-accessible',
      categoryIds: [TEST_CATEGORY_IDS.publicToilet],
      position: offsetNorthMeters(POINT_ON_ROUTE, 30),
      accessibility: 'yes',
      opening: { status: 'open', confidence: 0.9 },
    }),
    // Seconde option accessible, détour plus long (sert après route_changed).
    makeCandidate({
      merchantId: 'toilet-accessible-2',
      categoryIds: [TEST_CATEGORY_IDS.publicToilet],
      position: offsetNorthMeters(POINT_ON_ROUTE, 60),
      accessibility: 'yes',
      opening: { status: 'open', confidence: 0.8 },
    }),
    // Accessibilité inconnue : exclue en session fauteuil (jamais « accessible »).
    makeCandidate({
      merchantId: 'toilet-unknown-access',
      categoryIds: [TEST_CATEGORY_IDS.publicToilet],
      position: offsetNorthMeters(POINT_ON_ROUTE, 20),
      accessibility: 'unknown',
      opening: { status: 'open', confidence: 0.9 },
    }),
    // Boulangeries pour le scénario marche (mission bread).
    makeCandidate({
      merchantId: 'bakery-on-route',
      categoryIds: [TEST_CATEGORY_IDS.bakery],
      position: { ...SIMULATED_ROUTE_COMEDIE_ARCEAUX.polyline[2] },
      accessibility: 'yes',
      opening: { status: 'open', confidence: 0.9 },
    }),
    makeCandidate({
      merchantId: 'bakery-hours-unknown',
      categoryIds: [TEST_CATEGORY_IDS.bakery],
      position: offsetNorthMeters(POINT_ON_ROUTE, 40),
      accessibility: 'yes',
      opening: { status: 'unknown', confidence: 0 },
    }),
    makeCandidate({
      merchantId: 'cafe-closed',
      categoryIds: [TEST_CATEGORY_IDS.coffeeShop],
      position: offsetNorthMeters(POINT_ON_ROUTE, 50),
      accessibility: 'yes',
      opening: { status: 'closed', confidence: 0.9 },
    }),
  ];
}

export interface ScenarioProviderCalls {
  planRoute: RouteRequest[];
  evaluateDetours: { routeVersion: number; merchantIds: string[] }[];
}

export interface ScenarioProviderOptions {
  /** Routes servies successivement par planRoute (v1 puis v2, etc.). */
  routes: readonly PlannedRoute[];
  /** true → planRoute rejette (fournisseur indisponible). */
  unavailable?: boolean;
  /** Force la version de route portée par les évaluations (test binding). */
  evaluationRouteVersionOverride?: number;
}

export interface ScenarioRouteProvider extends RouteProviderPort {
  readonly calls: ScenarioProviderCalls;
}

/**
 * Fournisseur scripté : routes servies en séquence, évaluations dérivées de
 * la table fixe SCENARIO_DETOUR_SECONDS pour les candidats demandés.
 */
export function createScenarioRouteProvider(
  options: ScenarioProviderOptions,
): ScenarioRouteProvider {
  const calls: ScenarioProviderCalls = { planRoute: [], evaluateDetours: [] };
  let served = 0;
  return {
    calls,
    planRoute(request: RouteRequest): Promise<PlannedRoute> {
      calls.planRoute.push(request);
      if (options.unavailable === true) {
        return Promise.reject(new Error('scenario_provider_unavailable'));
      }
      const route = options.routes[Math.min(served, options.routes.length - 1)];
      served += 1;
      if (route === undefined) {
        return Promise.reject(new Error('scenario_route_missing'));
      }
      return Promise.resolve(route);
    },
    evaluateDetours(
      route: PlannedRoute,
      candidates: readonly MerchantCandidate[],
      nowMs: number,
    ): Promise<readonly RouteEvaluation[]> {
      calls.evaluateDetours.push({
        routeVersion: route.routeVersion,
        merchantIds: candidates.map((candidate) => candidate.merchantId),
      });
      const evaluations: RouteEvaluation[] = candidates.map((candidate) => ({
        merchantId: candidate.merchantId,
        routeVersion: options.evaluationRouteVersionOverride ?? route.routeVersion,
        exitPoint: { ...route.polyline[2] },
        rejoinPoint: { ...route.polyline[3] },
        etaAtMerchantMs: nowMs + 480_000,
        detourSeconds: SCENARIO_DETOUR_SECONDS[candidate.merchantId] ?? 120,
        detourMeters: (SCENARIO_DETOUR_SECONDS[candidate.merchantId] ?? 120) * 1.2,
        computedAtMs: nowMs,
      }));
      return Promise.resolve(evaluations);
    },
  };
}
