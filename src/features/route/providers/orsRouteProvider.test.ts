/**
 * Tests du fournisseur ORS pur : requête déterministe, restrictions
 * fauteuil injectées, parseur strict, erreurs typées sans coordonnées,
 * provenance complète, déterminisme intégral. Aucun réseau.
 */

import { FIXED_NOW_MS } from '../fixtures';
import type { RouteRequest } from '../ports';
import {
  createWheelchairRoutingConfig,
  ORS_DOCUMENTED_DEFAULTS_UNVALIDATED,
} from '../routingConfig';
import {
  buildOrsDirectionsRequest,
  createOrsRouteProvider,
  OrsDirectionsError,
  parseOrsDirectionsGeoJson,
} from './orsRouteProvider';

const ORIGIN = { latitude: 43.6086, longitude: 3.8797 };
const DESTINATION = { latitude: 43.6128, longitude: 3.8655 };

function request(mode: RouteRequest['mode']): RouteRequest {
  return { origin: ORIGIN, destination: DESTINATION, mode };
}

function orsPayload(
  coordinates: unknown,
  summary: unknown = { distance: 1820, duration: 1560 },
): unknown {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: { summary },
      },
    ],
  };
}

const VALID_COORDS = [
  [3.8797, 43.6086],
  [3.8741, 43.6109],
  [3.8655, 43.6128],
];

const PROVENANCE = {
  providerId: 'ors',
  profileId: 'wheelchair',
  routingConfigVersion: 1,
  accessibilityDataSource: 'osm_via_ors',
  validationStatus: 'unvalidated',
  generatedAtMs: FIXED_NOW_MS,
} as const;

const PARSE_META = {
  routeVersion: 2,
  departureAtMs: FIXED_NOW_MS,
  provenance: PROVENANCE,
};

describe('buildOrsDirectionsRequest', () => {
  const config = ORS_DOCUMENTED_DEFAULTS_UNVALIDATED;

  it('construit une requête wheelchair correcte : profil, ordre [lng, lat], restrictions injectées', () => {
    const result = buildOrsDirectionsRequest(request('wheelchair'), config);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.profile).toBe('wheelchair');
    expect(result.request.body.coordinates).toEqual([
      [3.8797, 43.6086],
      [3.8655, 43.6128],
    ]);
    expect(result.request.body.instructions).toBe(false);
    expect(result.request.body.options).toEqual({
      profile_params: {
        restrictions: {
          maximum_incline: 6,
          maximum_sloped_kerb: 0.06,
          surface_type: 'cobblestone:flattened',
          smoothness_type: 'good',
          track_type: 'grade1',
        },
      },
    });
  });

  it('les paramètres fauteuil sont injectables (y compris minimum_width)', () => {
    const custom = createWheelchairRoutingConfig({
      params: { maximumIncline: 3, maximumSlopedKerb: 0.03, minimumWidth: 0.9 },
      source: 'pilot_overrides',
      version: 2,
    });
    const result = buildOrsDirectionsRequest(request('wheelchair'), custom);
    if (!result.ok) throw new Error('requête attendue');
    const restrictions = result.request.body.options?.profile_params.restrictions;
    expect(restrictions).toMatchObject({
      maximum_incline: 3,
      maximum_sloped_kerb: 0.03,
      minimum_width: 0.9,
    });
  });

  it('walk → foot-walking sans restrictions fauteuil', () => {
    const result = buildOrsDirectionsRequest(request('walk'), config);
    if (!result.ok) throw new Error('requête attendue');
    expect(result.request.profile).toBe('foot-walking');
    expect(result.request.body.options).toBeUndefined();
  });

  it('bike, car et transit ne sont jamais construits par accident', () => {
    for (const mode of ['bike', 'car', 'transit'] as const) {
      expect(buildOrsDirectionsRequest(request(mode), config)).toEqual({
        ok: false,
        reason: 'unsupported_mode',
      });
    }
  });

  it('rejette des coordonnées de requête invalides', () => {
    const result = buildOrsDirectionsRequest(
      { origin: { latitude: 0, longitude: 0 }, destination: DESTINATION, mode: 'walk' },
      config,
    );
    expect(result).toEqual({ ok: false, reason: 'invalid_request_coordinates' });
  });

  it('est intégralement déterministe', () => {
    const a = buildOrsDirectionsRequest(request('wheelchair'), config);
    const b = buildOrsDirectionsRequest(request('wheelchair'), config);
    expect(a).toEqual(b);
  });
});

describe('parseOrsDirectionsGeoJson', () => {
  it('parse une réponse valide : ordre [longitude, latitude] converti, métriques et provenance conservées', () => {
    const result = parseOrsDirectionsGeoJson(orsPayload(VALID_COORDS), PARSE_META);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.route.polyline[0]).toEqual({ latitude: 43.6086, longitude: 3.8797 });
    expect(result.route.polyline).toHaveLength(3);
    expect(result.route.distanceMeters).toBe(1820);
    expect(result.route.durationSeconds).toBe(1560);
    expect(result.route.routeVersion).toBe(2);
    expect(result.route.provenance).toEqual(PROVENANCE);
  });

  it('rejette un payload invalide', () => {
    expect(parseOrsDirectionsGeoJson(null, PARSE_META)).toEqual({
      ok: false,
      reason: 'invalid_payload',
    });
    expect(parseOrsDirectionsGeoJson({ type: 'Nope' }, PARSE_META)).toEqual({
      ok: false,
      reason: 'invalid_payload',
    });
  });

  it('rejette l’absence de route', () => {
    expect(
      parseOrsDirectionsGeoJson({ type: 'FeatureCollection', features: [] }, PARSE_META),
    ).toEqual({ ok: false, reason: 'no_route' });
  });

  it('rejette une géométrie vide, à un seul point ou du mauvais type', () => {
    expect(parseOrsDirectionsGeoJson(orsPayload([]), PARSE_META)).toEqual({
      ok: false,
      reason: 'invalid_geometry',
    });
    expect(parseOrsDirectionsGeoJson(orsPayload([[3.88, 43.61]]), PARSE_META)).toEqual({
      ok: false,
      reason: 'invalid_geometry',
    });
  });

  it('rejette des coordonnées hors limites (ex. paire inversée devenant invalide) ou non numériques', () => {
    // Paire inversée [lat, lng] où la latitude résultante (91) sort du domaine.
    expect(
      parseOrsDirectionsGeoJson(orsPayload([[3.88, 43.61], [43.62, 91]]), PARSE_META),
    ).toEqual({ ok: false, reason: 'invalid_coordinates' });
    expect(
      parseOrsDirectionsGeoJson(orsPayload([[3.88, 43.61], ['x', 43.62]]), PARSE_META),
    ).toEqual({ ok: false, reason: 'invalid_coordinates' });
  });

  it('rejette distance ou durée négative ou manquante', () => {
    expect(
      parseOrsDirectionsGeoJson(
        orsPayload(VALID_COORDS, { distance: -1, duration: 100 }),
        PARSE_META,
      ),
    ).toEqual({ ok: false, reason: 'invalid_metrics' });
    expect(
      parseOrsDirectionsGeoJson(orsPayload(VALID_COORDS, {}), PARSE_META),
    ).toEqual({ ok: false, reason: 'invalid_metrics' });
  });
});

describe('createOrsRouteProvider', () => {
  function makeDeps(transportPayload: unknown | (() => Promise<unknown>)) {
    return {
      transport:
        typeof transportPayload === 'function'
          ? (transportPayload as () => Promise<unknown>)
          : () => Promise.resolve(transportPayload),
      nextRouteVersion: () => 4,
      nowMs: () => FIXED_NOW_MS,
      wheelchairConfig: ORS_DOCUMENTED_DEFAULTS_UNVALIDATED,
      routingConfigVersion: 1,
    };
  }

  it('wheelchair : route avec provenance complète, statut de config conservé', async () => {
    const provider = createOrsRouteProvider(makeDeps(orsPayload(VALID_COORDS)));
    const route = await provider.planRoute(request('wheelchair'));
    expect(route.provenance).toEqual({
      providerId: 'ors',
      profileId: 'wheelchair',
      routingConfigVersion: 1,
      accessibilityDataSource: 'osm_via_ors',
      validationStatus: 'unvalidated',
      generatedAtMs: FIXED_NOW_MS,
    });
    expect(route.routeVersion).toBe(4);
  });

  it('une config pilot_validated est reflétée telle quelle dans la provenance', async () => {
    const deps = {
      ...makeDeps(orsPayload(VALID_COORDS)),
      wheelchairConfig: createWheelchairRoutingConfig({
        validationStatus: 'pilot_validated',
        source: 'pilot_2026_09',
        version: 3,
      }),
      routingConfigVersion: 3,
    };
    const route = await createOrsRouteProvider(deps).planRoute(request('wheelchair'));
    expect(route.provenance.validationStatus).toBe('pilot_validated');
    expect(route.provenance.routingConfigVersion).toBe(3);
  });

  it('walk : accessibilityDataSource none et validation not_applicable', async () => {
    const provider = createOrsRouteProvider(makeDeps(orsPayload(VALID_COORDS)));
    const route = await provider.planRoute(request('walk'));
    expect(route.provenance.profileId).toBe('foot-walking');
    expect(route.provenance.accessibilityDataSource).toBe('none');
    expect(route.provenance.validationStatus).toBe('not_applicable');
  });

  it('ORS indisponible → OrsDirectionsError provider_unavailable, sans aucune coordonnée', async () => {
    const provider = createOrsRouteProvider(
      makeDeps(() => Promise.reject(new Error('network down'))),
    );
    let caught: unknown;
    try {
      await provider.planRoute(request('wheelchair'));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(OrsDirectionsError);
    const err = caught as OrsDirectionsError;
    expect(err.reason).toBe('provider_unavailable');
    // Aucune coordonnée, origine, destination ni géométrie dans le message.
    expect(err.message).toBe('ors_directions_provider_unavailable');
    expect(err.message).not.toMatch(/43\.|3\.8|latitude|longitude/);
  });

  it('les erreurs de parsing sont typées et sans coordonnées', async () => {
    const provider = createOrsRouteProvider(
      makeDeps({ type: 'FeatureCollection', features: [] }),
    );
    await expect(provider.planRoute(request('walk'))).rejects.toThrow(
      'ors_directions_no_route',
    );
  });

  it('evaluateDetours est hors périmètre du volet 1', async () => {
    const provider = createOrsRouteProvider(makeDeps(orsPayload(VALID_COORDS)));
    const route = await provider.planRoute(request('walk'));
    await expect(provider.evaluateDetours(route, [], FIXED_NOW_MS)).rejects.toThrow(
      'ors_matrix_not_implemented_lot2b',
    );
  });

  it('déterminisme intégral : deux appels identiques produisent la même route', async () => {
    const provider = createOrsRouteProvider(makeDeps(orsPayload(VALID_COORDS)));
    const a = await provider.planRoute(request('wheelchair'));
    const b = await provider.planRoute(request('wheelchair'));
    expect(a).toEqual(b);
  });
});
