/**
 * Fournisseur de route factice pour les tests et les trajets simulés.
 *
 * Il ne CALCULE rien : il rejoue des données scriptées injectées à la
 * construction (routes planifiées, évaluations de détour). Aucun réseau,
 * aucun aléa, aucune horloge cachée. Il enregistre les appels reçus pour
 * permettre des assertions.
 */

import type { MerchantCandidate, RouteEvaluation } from '../domain/types';
import type { PlannedRoute, RouteProviderPort, RouteRequest } from '../ports';

export interface FakeRouteProviderScript {
  /** Route retournée par planRoute. Absente → rejet déterministe. */
  plannedRoute?: PlannedRoute;
  /** Évaluations rejouées par evaluateDetours, filtrées par merchantId demandé. */
  evaluations?: readonly RouteEvaluation[];
}

export interface FakeRouteProviderCalls {
  planRoute: RouteRequest[];
  evaluateDetours: { routeVersion: number; merchantIds: string[]; nowMs: number }[];
}

export interface FakeRouteProvider extends RouteProviderPort {
  readonly calls: FakeRouteProviderCalls;
}

export function createFakeRouteProvider(script: FakeRouteProviderScript = {}): FakeRouteProvider {
  const calls: FakeRouteProviderCalls = { planRoute: [], evaluateDetours: [] };
  return {
    calls,
    planRoute(request: RouteRequest): Promise<PlannedRoute> {
      calls.planRoute.push(request);
      if (script.plannedRoute === undefined) {
        return Promise.reject(new Error('fake_route_missing'));
      }
      return Promise.resolve(script.plannedRoute);
    },
    evaluateDetours(
      route: PlannedRoute,
      candidates: readonly MerchantCandidate[],
      nowMs: number,
    ): Promise<readonly RouteEvaluation[]> {
      calls.evaluateDetours.push({
        routeVersion: route.routeVersion,
        merchantIds: candidates.map((candidate) => candidate.merchantId),
        nowMs,
      });
      const requested = new Set(candidates.map((candidate) => candidate.merchantId));
      return Promise.resolve(
        (script.evaluations ?? []).filter((evaluation) => requested.has(evaluation.merchantId)),
      );
    },
  };
}
