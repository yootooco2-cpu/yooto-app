/**
 * Tests des fournisseurs : FakeRouteProvider scripté, parseur Directions
 * GeoJSON (ordre longitude/latitude, routes vides/invalides), provider
 * Mapbox à transport injecté (aucun HTTP), source de candidats statique.
 */

import { FIXED_NOW_MS, makeCandidate, makeEvaluation, SIMULATED_ROUTE_COMEDIE_ARCEAUX } from '../fixtures';
import { makeComedieArceauxCandidates } from '../fixtures/corridorFixtures';
import { createFakeRouteProvider } from './fakeRouteProvider';
import {
  createMapboxRouteProvider,
  MapboxDirectionsError,
  mapboxProfileForMode,
  parseDirectionsGeoJson,
} from './mapboxRouteProvider';
import { createStaticCandidateSource } from './staticCandidateSource';

const TEST_PROVENANCE = {
  providerId: 'mapbox',
  profileId: 'mapbox/walking',
  routingConfigVersion: 0,
  accessibilityDataSource: 'none',
  validationStatus: 'not_applicable',
  generatedAtMs: FIXED_NOW_MS,
} as const;

const PARSE_META = {
  routeVersion: 3,
  departureAtMs: FIXED_NOW_MS,
  provenance: TEST_PROVENANCE,
};

function directionsPayload(coordinates: unknown, duration = 900, distance = 1200): unknown {
  return {
    code: 'Ok',
    routes: [{ geometry: { type: 'LineString', coordinates }, duration, distance }],
  };
}

describe('createFakeRouteProvider', () => {
  it('rejoue la route scriptée et enregistre les appels', async () => {
    const provider = createFakeRouteProvider({ plannedRoute: SIMULATED_ROUTE_COMEDIE_ARCEAUX });
    const request = {
      origin: SIMULATED_ROUTE_COMEDIE_ARCEAUX.polyline[0],
      destination: SIMULATED_ROUTE_COMEDIE_ARCEAUX.polyline[5],
      mode: 'wheelchair' as const,
    };
    await expect(provider.planRoute(request)).resolves.toBe(SIMULATED_ROUTE_COMEDIE_ARCEAUX);
    expect(provider.calls.planRoute).toEqual([request]);
  });

  it('rejette de façon déterministe sans route scriptée', async () => {
    await expect(
      createFakeRouteProvider().planRoute({
        origin: { latitude: 43.6, longitude: 3.87 },
        destination: { latitude: 43.62, longitude: 3.88 },
        mode: 'walk',
      }),
    ).rejects.toThrow('fake_route_missing');
  });

  it('ne retourne que les évaluations des candidats demandés', async () => {
    const provider = createFakeRouteProvider({
      evaluations: [
        makeEvaluation({ merchantId: 'a' }),
        makeEvaluation({ merchantId: 'b' }),
      ],
    });
    const result = await provider.evaluateDetours(
      SIMULATED_ROUTE_COMEDIE_ARCEAUX,
      [makeCandidate({ merchantId: 'a' })],
      FIXED_NOW_MS,
    );
    expect(result.map((evaluation) => evaluation.merchantId)).toEqual(['a']);
    expect(provider.calls.evaluateDetours).toHaveLength(1);
  });
});

describe('mapboxProfileForMode', () => {
  it('mappe chaque mode avec honnêteté sur le fauteuil roulant', () => {
    expect(mapboxProfileForMode('walk')).toEqual({ profile: 'walking', exact: true });
    expect(mapboxProfileForMode('bike')).toEqual({ profile: 'cycling', exact: true });
    expect(mapboxProfileForMode('car')).toEqual({ profile: 'driving', exact: true });
    // Pas de profil PMR chez Mapbox : approximation EXPLICITE, jamais exacte.
    expect(mapboxProfileForMode('wheelchair')).toEqual({ profile: 'walking', exact: false });
    expect(mapboxProfileForMode('transit').profile).toBeNull();
  });
});

describe('parseDirectionsGeoJson', () => {
  it('convertit les paires GeoJSON [longitude, latitude] en GeoPoint', () => {
    const result = parseDirectionsGeoJson(
      directionsPayload([
        [3.8797, 43.6086],
        [3.8655, 43.6128],
      ]),
      PARSE_META,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.route.polyline[0]).toEqual({ latitude: 43.6086, longitude: 3.8797 });
    expect(result.route.polyline[1]).toEqual({ latitude: 43.6128, longitude: 3.8655 });
    expect(result.route.routeVersion).toBe(3);
    expect(result.route.departureAtMs).toBe(FIXED_NOW_MS);
    expect(result.route.durationSeconds).toBe(900);
    expect(result.route.distanceMeters).toBe(1200);
  });

  it('rejette payload invalide, absence de route, géométrie vide ou à un seul point', () => {
    expect(parseDirectionsGeoJson(null, PARSE_META)).toEqual({ ok: false, reason: 'invalid_payload' });
    expect(parseDirectionsGeoJson({ code: 'Ok', routes: [] }, PARSE_META)).toEqual({
      ok: false,
      reason: 'no_route',
    });
    expect(parseDirectionsGeoJson(directionsPayload([]), PARSE_META)).toEqual({
      ok: false,
      reason: 'invalid_geometry',
    });
    expect(parseDirectionsGeoJson(directionsPayload([[3.88, 43.61]]), PARSE_META)).toEqual({
      ok: false,
      reason: 'invalid_geometry',
    });
  });

  it('rejette des coordonnées non numériques ou hors bornes', () => {
    expect(
      parseDirectionsGeoJson(directionsPayload([[3.88, 43.61], ['x', 43.62]]), PARSE_META),
    ).toEqual({ ok: false, reason: 'invalid_coordinates' });
    expect(
      parseDirectionsGeoJson(directionsPayload([[3.88, 43.61], [3.89, 91]]), PARSE_META),
    ).toEqual({ ok: false, reason: 'invalid_coordinates' });
  });

  it('rejette des métriques manquantes ou négatives', () => {
    expect(
      parseDirectionsGeoJson(
        directionsPayload([[3.88, 43.61], [3.89, 43.62]], -5),
        PARSE_META,
      ),
    ).toEqual({ ok: false, reason: 'invalid_metrics' });
  });
});

describe('createMapboxRouteProvider — transport injecté, zéro HTTP', () => {
  const deps = {
    nextRouteVersion: () => 7,
    nowMs: () => FIXED_NOW_MS,
  };

  it('planRoute parse le payload injecté et versionne la route', async () => {
    const transportCalls: unknown[] = [];
    const provider = createMapboxRouteProvider({
      ...deps,
      transport: (request) => {
        transportCalls.push(request);
        return Promise.resolve(directionsPayload([[3.8797, 43.6086], [3.8655, 43.6128]]));
      },
    });
    const route = await provider.planRoute({
      origin: { latitude: 43.6086, longitude: 3.8797 },
      destination: { latitude: 43.6128, longitude: 3.8655 },
      mode: 'walk',
    });
    expect(route.routeVersion).toBe(7);
    expect(transportCalls).toHaveLength(1);
  });

  it('rejette un mode sans profil (transit) AVANT tout transport', async () => {
    const provider = createMapboxRouteProvider({
      ...deps,
      transport: () => {
        throw new Error('le transport ne doit pas être appelé');
      },
    });
    await expect(
      provider.planRoute({
        origin: { latitude: 43.6, longitude: 3.87 },
        destination: { latitude: 43.62, longitude: 3.88 },
        mode: 'transit',
      }),
    ).rejects.toThrow(MapboxDirectionsError);
  });

  it('propage un échec de parsing en erreur typée', async () => {
    const provider = createMapboxRouteProvider({
      ...deps,
      transport: () => Promise.resolve({ code: 'Ok', routes: [] }),
    });
    await expect(
      provider.planRoute({
        origin: { latitude: 43.6, longitude: 3.87 },
        destination: { latitude: 43.62, longitude: 3.88 },
        mode: 'walk',
      }),
    ).rejects.toThrow('mapbox_directions_no_route');
  });

  it('evaluateDetours est explicitement hors périmètre du Lot 2A', async () => {
    const provider = createMapboxRouteProvider({
      ...deps,
      transport: () => Promise.resolve({}),
    });
    await expect(
      provider.evaluateDetours(SIMULATED_ROUTE_COMEDIE_ARCEAUX, [], FIXED_NOW_MS),
    ).rejects.toThrow('matrix_not_implemented_lot2a');
  });
});

describe('createStaticCandidateSource', () => {
  const width = 200;
  const query = {
    corridor: SIMULATED_ROUTE_COMEDIE_ARCEAUX.polyline,
    corridorWidthMeters: width,
    categoryIds: [] as readonly string[],
    limit: 50,
  };

  it('filtre géographiquement une collection explicite (sans réseau ni hook)', async () => {
    const source = createStaticCandidateSource(makeComedieArceauxCandidates(width));
    const found = await source.findCandidates(query);
    expect(found.map((candidate) => candidate.merchantId)).toEqual(['on-route', 'inside']);
  });

  it('filtre par identifiants de catégories quand ils sont fournis', async () => {
    const source = createStaticCandidateSource(makeComedieArceauxCandidates(width));
    const found = await source.findCandidates({
      ...query,
      categoryIds: ['test.cat.pharmacy'],
    });
    expect(found).toEqual([]);
  });

  it('applique la limite', async () => {
    const source = createStaticCandidateSource(makeComedieArceauxCandidates(width));
    const found = await source.findCandidates({ ...query, limit: 1 });
    expect(found.map((candidate) => candidate.merchantId)).toEqual(['on-route']);
  });

  it('route inconstructible (vide ou un point) → absence honnête, jamais une erreur', async () => {
    const source = createStaticCandidateSource(makeComedieArceauxCandidates(width));
    await expect(source.findCandidates({ ...query, corridor: [] })).resolves.toEqual([]);
    await expect(
      source.findCandidates({ ...query, corridor: [query.corridor[0]] }),
    ).resolves.toEqual([]);
  });
});
