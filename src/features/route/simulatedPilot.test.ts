/**
 * Pilote SIMULÉ de bout en bout — Comédie → Arceaux (Lot 2C).
 *
 * Prouve sur fixtures : fauteuil nominal (libellé plafonné, trois notions
 * d'accessibilité distinctes), marche nominale, changement de route avec
 * invalidation complète de l'ancienne recommandation, refus non reproposé,
 * état vide honnête, déterminisme intégral. Aucun réseau, aucun GPS réel.
 */

import { createRouteEngineConfig } from './config';
import { WHEELCHAIR_ROUTE_MAX_LABEL } from './domain/reasons';
import { checkRecommendationUsability } from './domain/recommend';
import { transition } from './domain/session';
import { FIXED_NOW_MS, TEST_MISSIONS } from './fixtures';
import {
  createScenarioRouteProvider,
  makeOrsScenarioRoute,
  makeScenarioCandidates,
} from './fixtures/scenarioFixtures';
import type { OrchestratorDeps, RouteSessionRequest } from './orchestrator';
import { changeRoute, startRouteSession } from './orchestrator';
import { createPilotProviderRegistry } from './providers/providerRegistry';

const ORIGIN = { latitude: 43.6086, longitude: 3.8797 };
const DESTINATION = { latitude: 43.6128, longitude: 3.8655 };

function pilotSetup(routeVersions: readonly number[] = [1]) {
  const provider = createScenarioRouteProvider({
    routes: routeVersions.map((version) => makeOrsScenarioRoute('wheelchair', version)),
  });
  const deps: OrchestratorDeps = {
    registry: createPilotProviderRegistry({ orsProvider: provider, routingConfigVersion: 1 }),
    candidates: makeScenarioCandidates(),
    config: createRouteEngineConfig(),
  };
  return { deps, provider };
}

function wheelchairRequest(overrides: Partial<RouteSessionRequest> = {}): RouteSessionRequest {
  return {
    sessionId: 'pilot-1',
    mode: 'wheelchair',
    mission: TEST_MISSIONS.accessible_toilet,
    origin: ORIGIN,
    destination: DESTINATION,
    consentGiven: true,
    nowMs: FIXED_NOW_MS,
    ...overrides,
  };
}

describe('pilote simulé — fauteuil nominal', () => {
  it('recommande le commerce accessible vérifié, avec libellé plafonné et audit complet', async () => {
    const { deps } = pilotSetup();
    const outcome = await startRouteSession(wheelchairRequest(), deps);
    if (outcome.kind !== 'suggestion') throw new Error('suggestion attendue');

    expect(outcome.activeRecommendation.merchantId).toBe('toilet-accessible');
    expect(outcome.activeRecommendation.reason).toContain('Accès fauteuil indiqué');

    // Libellé MAXIMAL exact — la mention config non validée reste dans
    // l'audit, jamais transformée en message utilisateur automatique.
    expect(outcome.routeLabel).toBe(WHEELCHAIR_ROUTE_MAX_LABEL);
    expect(outcome.routeLabel).not.toMatch(/garanti|totalement|non validés/i);

    // Trois notions d'accessibilité DISTINCTES dans l'audit.
    expect(outcome.audit.accessibility).toEqual({
      routeAdaptation: 'estimated_from_osm_data',
      routingConfigValidation: 'unvalidated',
      recommendedMerchantAccessibility: 'yes',
    });

    // Binding et provenance cohérents de bout en bout.
    expect(outcome.binding).toEqual({
      providerId: 'ors',
      profileId: 'wheelchair',
      routingConfigVersion: 1,
    });
    expect(outcome.audit.routeProvenance.accessibilityDataSource).toBe('osm_via_ors');

    // L'accessibilité inconnue est exclue (jamais « accessible » par défaut).
    expect(outcome.audit.recommendation.exclusionCounts.accessibility_unknown_required).toBe(1);
  });

  it('est intégralement déterministe : deux exécutions identiques', async () => {
    const first = await startRouteSession(wheelchairRequest(), pilotSetup().deps);
    const second = await startRouteSession(wheelchairRequest(), pilotSetup().deps);
    expect(second).toEqual(first);
  });
});

describe('pilote simulé — marche nominale', () => {
  it('mission bread : boulangerie sur le trajet recommandée, sans libellé fauteuil', async () => {
    const provider = createScenarioRouteProvider({
      routes: [makeOrsScenarioRoute('walk', 1)],
    });
    const deps: OrchestratorDeps = {
      registry: createPilotProviderRegistry({ orsProvider: provider, routingConfigVersion: 1 }),
      candidates: makeScenarioCandidates(),
      config: createRouteEngineConfig(),
    };
    const outcome = await startRouteSession(
      wheelchairRequest({ mode: 'walk', mission: TEST_MISSIONS.bread }),
      deps,
    );
    if (outcome.kind !== 'suggestion') throw new Error('suggestion attendue');
    expect(outcome.activeRecommendation.merchantId).toBe('bakery-on-route');
    expect(outcome.routeLabel).toBeNull();
    expect(outcome.audit.accessibility.routeAdaptation).toBe('not_estimated');
    expect(outcome.audit.accessibility.routingConfigValidation).toBe('not_applicable');
    // La boulangerie aux horaires inconnus reste éligible (mission non
    // essentielle) mais n'est pas la recommandation active.
    expect(outcome.audit.recommendation.eligibleCount).toBeGreaterThanOrEqual(2);
  });
});

describe('pilote simulé — changement de route', () => {
  it('invalide l’ancienne recommandation et ses évaluations, puis recommande sans reproposer l’annoncé', async () => {
    const { deps, provider } = pilotSetup([1, 2]);
    const first = await startRouteSession(wheelchairRequest(), deps);
    if (first.kind !== 'suggestion') throw new Error('suggestion attendue');
    const oldRecommendation = first.activeRecommendation;

    const second = await changeRoute(
      { session: first.session, binding: first.binding, route: first.route },
      { origin: ORIGIN, destination: DESTINATION, nowMs: FIXED_NOW_MS + 60_000 },
      deps,
    );
    if (second.kind !== 'suggestion') throw new Error('suggestion attendue après recalcul');

    // Nouvelle version de route, nouveau pipeline.
    expect(second.route.routeVersion).toBe(2);
    expect(provider.calls.evaluateDetours.map((call) => call.routeVersion)).toEqual([1, 2]);

    // PREUVE D'INVALIDATION : l'ancienne recommandation (v1) est rejetée
    // partout après la transition.
    expect(checkRecommendationUsability(oldRecommendation, 2, FIXED_NOW_MS + 60_000)).toEqual({
      usable: false,
      invalidity: 'route_changed',
    });
    const reuse = transition(second.session, {
      type: 'suggest',
      recommendation: oldRecommendation,
      nowMs: FIXED_NOW_MS + 60_000,
    });
    expect(reuse).toMatchObject({ ok: false });

    // Le commerce annoncé en v1 n'est jamais reproposé dans la session.
    expect(second.activeRecommendation.merchantId).toBe('toilet-accessible-2');
    expect(second.audit.recommendation.exclusionCounts.already_announced).toBe(1);
    expect(second.session.announcedMerchantIds).toEqual([
      'toilet-accessible',
      'toilet-accessible-2',
    ]);
  });

  it('après refus, le commerce refusé n’est pas reproposé au pipeline suivant', async () => {
    const { deps } = pilotSetup([1, 2]);
    const first = await startRouteSession(wheelchairRequest(), deps);
    if (first.kind !== 'suggestion') throw new Error('suggestion attendue');

    const dismissed = transition(first.session, { type: 'dismiss', nowMs: FIXED_NOW_MS });
    if (!dismissed.ok) throw new Error('refus attendu');
    expect(dismissed.session.refusedMerchantIds).toEqual(['toilet-accessible']);

    const second = await changeRoute(
      { session: dismissed.session, binding: first.binding, route: first.route },
      { origin: ORIGIN, destination: DESTINATION, nowMs: FIXED_NOW_MS + 60_000 },
      deps,
    );
    if (second.kind !== 'suggestion') throw new Error('suggestion attendue');
    expect(second.activeRecommendation.merchantId).toBe('toilet-accessible-2');
    expect(second.audit.recommendation.exclusionCounts.already_refused).toBe(1);
  });
});

describe('pilote simulé — état vide honnête', () => {
  it('aucun candidat de la mission dans le corridor → no_candidate expliqué, session active', async () => {
    const { deps } = pilotSetup();
    const outcome = await startRouteSession(
      // Mission eau : aucun candidat grocery dans le corpus de scénario.
      wheelchairRequest({ mission: TEST_MISSIONS.water }),
      deps,
    );
    expect(outcome.kind).toBe('no_candidate');
    if (outcome.kind !== 'no_candidate') return;
    expect(outcome.explanation).toBe('Aucun commerce compatible sur ce trajet.');
    expect(outcome.session.status).toBe('active');
    expect(outcome.audit.shortlist.inputCount).toBe(0);
    expect(outcome.audit.accessibility.recommendedMerchantAccessibility).toBeNull();
  });
});
