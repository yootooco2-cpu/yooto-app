/**
 * Tests du registre de fournisseurs : sélection par mode, interdictions
 * fauteuil (Mapbox, non-capable), aucun fallback silencieux, état
 * accessible_route_unverifiable, cohérence de session (triplet
 * providerId + profileId + routingConfigVersion), libellés fauteuil.
 */

import { buildWheelchairRouteLabel, WHEELCHAIR_ROUTE_MAX_LABEL } from '../domain/reasons';
import { FIXED_NOW_MS, SIMULATED_ROUTE_COMEDIE_ARCEAUX } from '../fixtures';
import type { PlannedRoute, RouteProviderPort } from '../ports';
import { ORS_DOCUMENTED_DEFAULTS_UNVALIDATED } from '../routingConfig';
import { createOrsRouteProvider } from './orsRouteProvider';
import {
  ACCESSIBLE_ROUTE_UNVERIFIABLE,
  checkSessionBinding,
  createPilotProviderRegistry,
  createProviderRegistry,
  failureStateForMode,
  routeMatchesBinding,
} from './providerRegistry';

const NOOP_PROVIDER: RouteProviderPort = {
  planRoute: () => Promise.reject(new Error('not_used')),
  evaluateDetours: () => Promise.reject(new Error('not_used')),
};

function orsProvider() {
  return createOrsRouteProvider({
    transport: () => Promise.reject(new Error('not_used')),
    nextRouteVersion: () => 1,
    nowMs: () => FIXED_NOW_MS,
    wheelchairConfig: ORS_DOCUMENTED_DEFAULTS_UNVALIDATED,
    routingConfigVersion: 1,
  });
}

describe('createProviderRegistry — enregistrement', () => {
  it('refuse Mapbox comme fournisseur wheelchair, même déclaré capable', () => {
    const registry = createProviderRegistry({ routingConfigVersion: 1 });
    expect(
      registry.register('wheelchair', {
        providerId: 'mapbox',
        profileId: 'mapbox/walking',
        provider: NOOP_PROVIDER,
        wheelchairCapable: true,
      }),
    ).toEqual({ ok: false, rejection: 'mapbox_forbidden_for_wheelchair' });
  });

  it('refuse un fournisseur non wheelchairCapable pour le mode wheelchair', () => {
    const registry = createProviderRegistry({ routingConfigVersion: 1 });
    expect(
      registry.register('wheelchair', {
        providerId: 'ors',
        profileId: 'foot-walking',
        provider: NOOP_PROVIDER,
        wheelchairCapable: false,
      }),
    ).toEqual({ ok: false, rejection: 'wheelchair_requires_capable_provider' });
  });

  it('refuse un double enregistrement du même mode (pas de remplacement en cours de session)', () => {
    const registry = createProviderRegistry({ routingConfigVersion: 1 });
    expect(
      registry.register('walk', {
        providerId: 'ors',
        profileId: 'foot-walking',
        provider: NOOP_PROVIDER,
        wheelchairCapable: false,
      }).ok,
    ).toBe(true);
    expect(
      registry.register('walk', {
        providerId: 'mapbox',
        profileId: 'mapbox/walking',
        provider: NOOP_PROVIDER,
        wheelchairCapable: false,
      }),
    ).toEqual({ ok: false, rejection: 'mode_already_registered' });
  });
});

describe('createProviderRegistry — résolution sans fallback', () => {
  it('wheelchair sans fournisseur → accessible_route_unverifiable, jamais walking', () => {
    const registry = createProviderRegistry({ routingConfigVersion: 1 });
    registry.register('walk', {
      providerId: 'ors',
      profileId: 'foot-walking',
      provider: NOOP_PROVIDER,
      wheelchairCapable: false,
    });
    // Même avec walk disponible, wheelchair ne bascule JAMAIS dessus.
    expect(registry.resolve('wheelchair')).toEqual({
      status: ACCESSIBLE_ROUTE_UNVERIFIABLE,
    });
  });

  it('car, bike et transit ne sont pas activés par accident', () => {
    const registry = createPilotProviderRegistry({
      orsProvider: orsProvider(),
      routingConfigVersion: 1,
    });
    for (const mode of ['bike', 'car', 'transit'] as const) {
      expect(registry.resolve(mode)).toEqual({ status: 'mode_not_enabled', mode });
    }
  });

  it('échec runtime : fauteuil → accessible_route_unverifiable ; autres → route_unavailable', () => {
    expect(failureStateForMode('wheelchair')).toBe(ACCESSIBLE_ROUTE_UNVERIFIABLE);
    expect(failureStateForMode('walk')).toBe('route_unavailable');
  });
});

describe('createPilotProviderRegistry — décision GATE 2B', () => {
  const registry = createPilotProviderRegistry({
    orsProvider: orsProvider(),
    routingConfigVersion: 1,
  });

  it('wheelchair → ORS wheelchair ; walk → ORS foot-walking', () => {
    const wheelchair = registry.resolve('wheelchair');
    expect(wheelchair.status).toBe('available');
    if (wheelchair.status !== 'available') return;
    expect(wheelchair.binding).toEqual({
      providerId: 'ors',
      profileId: 'wheelchair',
      routingConfigVersion: 1,
    });

    const walk = registry.resolve('walk');
    if (walk.status !== 'available') throw new Error('walk attendu');
    expect(walk.binding).toEqual({
      providerId: 'ors',
      profileId: 'foot-walking',
      routingConfigVersion: 1,
    });
  });
});

describe('cohérence de session — triplet provider/profil/config', () => {
  const binding = {
    providerId: 'ors',
    profileId: 'wheelchair',
    routingConfigVersion: 1,
  } as const;

  it('accepte un triplet identique', () => {
    expect(checkSessionBinding(binding, { ...binding })).toEqual({ ok: true });
  });

  it('rejette un changement de fournisseur en cours de session', () => {
    expect(
      checkSessionBinding(binding, { ...binding, providerId: 'mapbox' }),
    ).toEqual({ ok: false, mismatch: 'provider_mismatch' });
  });

  it('rejette un changement de profil (wheelchair → foot-walking)', () => {
    expect(
      checkSessionBinding(binding, { ...binding, profileId: 'foot-walking' }),
    ).toEqual({ ok: false, mismatch: 'profile_mismatch' });
  });

  it('rejette un changement de version de configuration', () => {
    expect(
      checkSessionBinding(binding, { ...binding, routingConfigVersion: 2 }),
    ).toEqual({ ok: false, mismatch: 'routing_config_version_mismatch' });
  });

  it('routeMatchesBinding : une route d’un autre graphe est refusée', () => {
    const route: PlannedRoute = {
      ...SIMULATED_ROUTE_COMEDIE_ARCEAUX,
      provenance: {
        providerId: 'ors',
        profileId: 'wheelchair',
        routingConfigVersion: 1,
        accessibilityDataSource: 'osm_via_ors',
        validationStatus: 'unvalidated',
        generatedAtMs: FIXED_NOW_MS,
      },
    };
    expect(routeMatchesBinding(binding, route)).toEqual({ ok: true });
    // La route fixture (providerId 'fixture') n'appartient pas au graphe ORS.
    expect(routeMatchesBinding(binding, SIMULATED_ROUTE_COMEDIE_ARCEAUX)).toEqual({
      ok: false,
      mismatch: 'provider_mismatch',
    });
  });
});

describe('libellés fauteuil — jamais de garantie', () => {
  it('le libellé maximal est exactement celui du GATE 2B', () => {
    expect(WHEELCHAIR_ROUTE_MAX_LABEL).toBe(
      'Itinéraire adapté fauteuil d’après les données disponibles',
    );
  });

  it('config non validée → mention explicite ; jamais « garanti » ni « totalement »', () => {
    const unvalidated = buildWheelchairRouteLabel('unvalidated');
    const validated = buildWheelchairRouteLabel('pilot_validated');
    expect(unvalidated).toContain('non validés terrain');
    expect(validated).toBe(WHEELCHAIR_ROUTE_MAX_LABEL);
    for (const label of [unvalidated, validated]) {
      expect(label).not.toMatch(/garanti/i);
      expect(label).not.toMatch(/totalement/i);
    }
  });
});
