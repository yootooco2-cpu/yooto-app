/**
 * Tests unitaires de l'orchestrateur : échecs métier typés (jamais
 * d'exception pour un cas normal), contrôles de binding à chaque étape,
 * aucune coordonnée dans les résultats d'échec, aucun fallback fauteuil.
 */

import { createRouteEngineConfig } from './config';
import { FIXED_NOW_MS, TEST_MISSIONS } from './fixtures';
import {
  createScenarioRouteProvider,
  makeOrsScenarioRoute,
  makeScenarioCandidates,
  orsScenarioProvenance,
} from './fixtures/scenarioFixtures';
import type { OrchestratorDeps, RouteSessionRequest } from './orchestrator';
import { startRouteSession } from './orchestrator';
import type { PlannedRoute } from './ports';
import { createPilotProviderRegistry, createProviderRegistry } from './providers/providerRegistry';

const ORIGIN = { latitude: 43.6086, longitude: 3.8797 };
const DESTINATION = { latitude: 43.6128, longitude: 3.8655 };

function makeRequest(overrides: Partial<RouteSessionRequest> = {}): RouteSessionRequest {
  return {
    sessionId: 'session-1',
    mode: 'wheelchair',
    mission: TEST_MISSIONS.accessible_toilet,
    origin: ORIGIN,
    destination: DESTINATION,
    consentGiven: true,
    nowMs: FIXED_NOW_MS,
    ...overrides,
  };
}

function makeDeps(
  routes: readonly PlannedRoute[],
  options: { unavailable?: boolean; evaluationRouteVersionOverride?: number } = {},
) {
  const provider = createScenarioRouteProvider({ routes, ...options });
  const deps: OrchestratorDeps = {
    registry: createPilotProviderRegistry({ orsProvider: provider, routingConfigVersion: 1 }),
    candidates: makeScenarioCandidates(),
    config: createRouteEngineConfig(),
  };
  return { deps, provider };
}

describe('startRouteSession — échecs métier typés', () => {
  it('consentement absent → consent_missing, sans exception', async () => {
    const { deps } = makeDeps([makeOrsScenarioRoute('wheelchair', 1)]);
    const outcome = await startRouteSession(makeRequest({ consentGiven: false }), deps);
    expect(outcome).toEqual({
      kind: 'failure',
      reason: 'consent_missing',
      detail: 'consent_missing',
    });
  });

  it('bike/car/transit → mode_not_enabled, jamais activés par accident', async () => {
    const { deps } = makeDeps([makeOrsScenarioRoute('walk', 1)]);
    for (const mode of ['bike', 'car', 'transit'] as const) {
      const outcome = await startRouteSession(
        makeRequest({ mode, mission: TEST_MISSIONS.bread }),
        deps,
      );
      expect(outcome).toEqual({ kind: 'failure', reason: 'mode_not_enabled' });
    }
  });

  it('fauteuil sans fournisseur enregistré → accessible_route_unverifiable', async () => {
    const deps: OrchestratorDeps = {
      registry: createProviderRegistry({ routingConfigVersion: 1 }),
      candidates: makeScenarioCandidates(),
      config: createRouteEngineConfig(),
    };
    const outcome = await startRouteSession(makeRequest(), deps);
    expect(outcome).toEqual({ kind: 'failure', reason: 'accessible_route_unverifiable' });
  });

  it('ORS indisponible en fauteuil → accessible_route_unverifiable, ZÉRO tentative walking', async () => {
    const { deps, provider } = makeDeps([makeOrsScenarioRoute('wheelchair', 1)], {
      unavailable: true,
    });
    const outcome = await startRouteSession(makeRequest(), deps);
    expect(outcome).toEqual({ kind: 'failure', reason: 'accessible_route_unverifiable' });
    // Une seule demande de route, en mode wheelchair — aucun repli piéton.
    expect(provider.calls.planRoute).toHaveLength(1);
    expect(provider.calls.planRoute[0].mode).toBe('wheelchair');
    expect(provider.calls.evaluateDetours).toHaveLength(0);
  });

  it('fournisseur indisponible en marche → route_unavailable', async () => {
    const { deps } = makeDeps([makeOrsScenarioRoute('walk', 1)], { unavailable: true });
    const outcome = await startRouteSession(
      makeRequest({ mode: 'walk', mission: TEST_MISSIONS.bread }),
      deps,
    );
    expect(outcome).toEqual({ kind: 'failure', reason: 'route_unavailable' });
  });

  it('route à un seul point → corridor_unconstructible', async () => {
    const single = makeOrsScenarioRoute('wheelchair', 1);
    const outcome = await startRouteSession(
      makeRequest(),
      makeDeps([{ ...single, polyline: [single.polyline[0]] }]).deps,
    );
    expect(outcome).toEqual({
      kind: 'failure',
      reason: 'corridor_unconstructible',
      detail: 'single_point_route',
    });
  });

  it('aucune coordonnée brute dans les résultats d’échec', async () => {
    const { deps } = makeDeps([makeOrsScenarioRoute('wheelchair', 1)], { unavailable: true });
    const outcome = await startRouteSession(makeRequest(), deps);
    expect(JSON.stringify(outcome)).not.toMatch(/43\.6|3\.8[67]|latitude|longitude/);
  });
});

describe('startRouteSession — contrôles de binding', () => {
  it('route au mauvais graphe (provenance mapbox) → binding_mismatch, pipeline arrêté', async () => {
    const wrongGraph: PlannedRoute = {
      ...makeOrsScenarioRoute('wheelchair', 1),
      provenance: {
        ...orsScenarioProvenance('wheelchair', 1),
        providerId: 'mapbox',
        profileId: 'mapbox/walking',
      },
    };
    const { deps, provider } = makeDeps([wrongGraph]);
    const outcome = await startRouteSession(makeRequest(), deps);
    expect(outcome).toEqual({
      kind: 'failure',
      reason: 'binding_mismatch',
      detail: 'provider_mismatch',
    });
    // Arrêt AVANT toute évaluation de détour.
    expect(provider.calls.evaluateDetours).toHaveLength(0);
  });

  it('version de config différente → binding_mismatch', async () => {
    // Route déclarant une config v2 alors que le registre est en v1.
    const { deps } = makeDeps([makeOrsScenarioRoute('wheelchair', 1, 2)]);
    const outcome = await startRouteSession(makeRequest(), deps);
    expect(outcome).toEqual({
      kind: 'failure',
      reason: 'binding_mismatch',
      detail: 'routing_config_version_mismatch',
    });
  });

  it('évaluation portant une autre version de route → binding_mismatch (jamais ignorée)', async () => {
    const { deps } = makeDeps([makeOrsScenarioRoute('wheelchair', 1)], {
      evaluationRouteVersionOverride: 99,
    });
    const outcome = await startRouteSession(makeRequest(), deps);
    expect(outcome).toEqual({
      kind: 'failure',
      reason: 'binding_mismatch',
      detail: 'evaluation_route_version_mismatch',
    });
  });
});

describe('startRouteSession — recommandation unique', () => {
  it('une seule recommandation active ; alternatives internes bornées et auditables', async () => {
    const { deps } = makeDeps([makeOrsScenarioRoute('wheelchair', 1)]);
    const outcome = await startRouteSession(makeRequest(), deps);
    expect(outcome.kind).toBe('suggestion');
    if (outcome.kind !== 'suggestion') return;

    // Produit : UNE seule suggestion active.
    expect(outcome.activeRecommendation.merchantId).toBe('toilet-accessible');
    expect(outcome.session.status).toBe('suggesting');
    expect(outcome.session.announcedMerchantIds).toEqual(['toilet-accessible']);

    // Interne : alternatives bornées, avec score/facteurs/notes conservés.
    expect(outcome.internalAlternatives.length).toBeLessThanOrEqual(
      deps.config.maxAlternatives,
    );
    for (const alternative of outcome.internalAlternatives) {
      expect(alternative.score).toBeGreaterThanOrEqual(0);
      expect(alternative.factors).toBeDefined();
      expect(alternative.routeVersion).toBe(1);
    }
    // L'alternative n'est PAS annoncée : pas de suggestions simultanées.
    expect(outcome.session.announcedMerchantIds).not.toContain('toilet-accessible-2');
  });
});
