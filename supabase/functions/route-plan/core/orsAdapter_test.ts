/**
 * Tests de l'adaptateur ORS : constantes serveur, corps construits côté
 * serveur, clé en en-tête uniquement, codes amont distincts, aucun corps
 * d'erreur ORS propagé.
 */

import { assert, assertEquals, assertNotContains } from './asserts.ts';
import type { DirectionsInput, MatrixInput } from './contracts.ts';
import { SERVER_ROUTING_CONFIG_V1 } from './canonicalConfig.ts';
import {
  buildDirectionsBody,
  buildMatrixBodies,
  callUpstream,
  directionsPayloadShapeOk,
  matrixPayloadShapeOk,
  ORS_ORIGIN,
  orsDirectionsPath,
  orsMatrixPath,
} from './orsAdapter.ts';

const ORIGIN = { latitude: 43.6086, longitude: 3.8797 };
const DESTINATION = { latitude: 43.6128, longitude: 3.8655 };
const WAYPOINT = { latitude: 43.61, longitude: 3.874 };
const BINDING = { providerId: 'ors', profileId: 'wheelchair', routingConfigVersion: 1 };

const DIRECTIONS_INPUT: DirectionsInput = {
  action: 'directions',
  mode: 'wheelchair',
  expectedBinding: BINDING,
  origin: ORIGIN,
  destination: DESTINATION,
  waypoint: WAYPOINT,
};

const MATRIX_INPUT: MatrixInput = {
  action: 'matrix',
  mode: 'walk',
  expectedBinding: { ...BINDING, profileId: 'foot-walking' },
  origin: ORIGIN,
  destination: DESTINATION,
  candidates: [
    { latitude: 43.6105, longitude: 3.8748 },
    { latitude: 43.611, longitude: 3.875 },
  ],
};

Deno.test('origine et chemins ORS sont des constantes serveur', () => {
  assertEquals(ORS_ORIGIN, 'https://api.openrouteservice.org');
  assertEquals(orsDirectionsPath('wheelchair'), '/v2/directions/wheelchair/geojson');
  assertEquals(orsMatrixPath('foot-walking'), '/v2/matrix/foot-walking');
});

Deno.test('corps Directions fauteuil : 3 points [lng,lat] + restrictions canoniques', () => {
  const body = buildDirectionsBody(DIRECTIONS_INPUT, SERVER_ROUTING_CONFIG_V1);
  assertEquals(body.coordinates, [
    [3.8797, 43.6086],
    [3.874, 43.61],
    [3.8655, 43.6128],
  ]);
  assertEquals(body.instructions, false);
  assertEquals(body.options, {
    profile_params: { restrictions: SERVER_ROUTING_CONFIG_V1.wheelchairRestrictions },
  });
});

Deno.test('corps Directions marche : sans options fauteuil', () => {
  const body = buildDirectionsBody(
    { ...DIRECTIONS_INPUT, mode: 'walk', waypoint: undefined },
    SERVER_ROUTING_CONFIG_V1,
  );
  assertEquals((body.coordinates as unknown[]).length, 2);
  assert(body.options === undefined);
});

Deno.test('corps Matrix : deux rectangulaires N+1 et N paires, métriques fixées', () => {
  const { bodyA, bodyB } = buildMatrixBodies(MATRIX_INPUT);
  assertEquals((bodyA.locations as unknown[]).length, 4); // origine + destination + 2
  assertEquals(bodyA.sources, [0]);
  assertEquals(bodyA.destinations, [1, 2, 3]); // 3 paires = N+1
  assertEquals(bodyA.metrics, ['duration', 'distance']);
  assertEquals((bodyB.locations as unknown[]).length, 3); // 2 candidats + destination
  assertEquals(bodyB.sources, [0, 1]);
  assertEquals(bodyB.destinations, [2]); // 2 paires = N
});

/** Payload Directions valide pour les tests de forme. */
function validDirectionsPayload(segmentCount: number | null = null): unknown {
  return {
    type: 'FeatureCollection',
    features: [
      {
        geometry: {
          type: 'LineString',
          coordinates: [
            [3.8797, 43.6086],
            [3.8655, 43.6128],
          ],
        },
        properties: {
          summary: { duration: 1800, distance: 2100 },
          ...(segmentCount !== null
            ? {
                segments: Array.from({ length: segmentCount }, () => ({
                  duration: 700,
                  distance: 800,
                })),
              }
            : {}),
        },
      },
    ],
  };
}

const DIRECTIONS_REQ_2PTS = { coordinates: [[3.8797, 43.6086], [3.8655, 43.6128]] };
const DIRECTIONS_REQ_3PTS = {
  coordinates: [[3.8797, 43.6086], [3.874, 43.61], [3.8655, 43.6128]],
};
const MATRIX_REQ_1x2 = { sources: [0], destinations: [1, 2] };

Deno.test('clé API : en-tête Authorization uniquement, jamais dans l’URL', async () => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const result = await callUpstream(
    {
      fetchFn: (url, init) => {
        calls.push({ url, headers: { ...init.headers } });
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve(validDirectionsPayload()),
        });
      },
      apiKeyProvider: () => 'cle-de-test-factice',
    },
    orsDirectionsPath('wheelchair'),
    DIRECTIONS_REQ_2PTS,
    directionsPayloadShapeOk,
  );
  assert(result.ok);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].headers.authorization, 'cle-de-test-factice');
  assertNotContains(calls[0].url, 'cle-de-test-factice');
  assertNotContains(calls[0].url, 'api_key');
});

Deno.test('codes amont distincts : 429, 5xx, JSON invalide, forme invalide', async () => {
  const deps = (status: number, payload: unknown = {}, jsonThrows = false) => ({
    fetchFn: () =>
      Promise.resolve({
        status,
        json: () =>
          jsonThrows ? Promise.reject(new Error('boom')) : Promise.resolve(payload),
      }),
    apiKeyProvider: () => 'k',
  });
  assertEquals(
    await callUpstream(deps(429), '/p', DIRECTIONS_REQ_2PTS, directionsPayloadShapeOk),
    { ok: false, code: 'upstream_rate_limited' },
  );
  assertEquals(
    await callUpstream(deps(500), '/p', DIRECTIONS_REQ_2PTS, directionsPayloadShapeOk),
    { ok: false, code: 'upstream_unavailable' },
  );
  assertEquals(
    await callUpstream(deps(200, {}, true), '/p', DIRECTIONS_REQ_2PTS, directionsPayloadShapeOk),
    { ok: false, code: 'upstream_invalid_response' },
  );
  // Réponse 200 mais structure d'erreur ORS déguisée : rejetée et JAMAIS
  // propagée telle quelle.
  const errorish = await callUpstream(
    deps(200, { error: { message: 'secret interne ORS' } }),
    '/p',
    DIRECTIONS_REQ_2PTS,
    directionsPayloadShapeOk,
  );
  assertEquals(errorish, { ok: false, code: 'upstream_invalid_response' });
  assertNotContains(JSON.stringify(errorish), 'secret interne ORS');
});

Deno.test('fetch qui rejette → upstream_unavailable', async () => {
  const result = await callUpstream(
    { fetchFn: () => Promise.reject(new Error('réseau coupé')), apiKeyProvider: () => 'k' },
    '/p',
    MATRIX_REQ_1x2,
    matrixPayloadShapeOk,
  );
  assertEquals(result, { ok: false, code: 'upstream_unavailable' });
});

Deno.test('forme Directions : summary, geometry, valeurs finies, erreur déguisée', () => {
  assert(directionsPayloadShapeOk(validDirectionsPayload(), DIRECTIONS_REQ_2PTS));
  // FeatureCollection vide ou mauvaise structure.
  assert(!directionsPayloadShapeOk({ type: 'FeatureCollection', features: [] }, DIRECTIONS_REQ_2PTS));
  assert(!directionsPayloadShapeOk({ routes: [] }, DIRECTIONS_REQ_2PTS));
  // Première feature invalide : sans geometry ou sans summary.
  assert(
    !directionsPayloadShapeOk(
      { type: 'FeatureCollection', features: [{ properties: { summary: { duration: 1, distance: 1 } } }] },
      DIRECTIONS_REQ_2PTS,
    ),
  );
  const noDistance = validDirectionsPayload() as {
    features: { properties: { summary: Record<string, unknown> } }[];
  };
  delete noDistance.features[0].properties.summary.distance;
  assert(!directionsPayloadShapeOk(noDistance, DIRECTIONS_REQ_2PTS));
  // Durée négative refusée.
  const negative = validDirectionsPayload() as {
    features: { properties: { summary: Record<string, unknown> } }[];
  };
  negative.features[0].properties.summary.duration = -1;
  assert(!directionsPayloadShapeOk(negative, DIRECTIONS_REQ_2PTS));
  // Structure d'erreur ORS déguisée en 200.
  assert(
    !directionsPayloadShapeOk(
      { ...(validDirectionsPayload() as Record<string, unknown>), error: { code: 2010 } },
      DIRECTIONS_REQ_2PTS,
    ),
  );
});

Deno.test('forme Directions waypoint : segments exigés, un par tronçon, durées valides', () => {
  // 3 points demandés → 2 segments exigés.
  assert(directionsPayloadShapeOk(validDirectionsPayload(2), DIRECTIONS_REQ_3PTS));
  assert(!directionsPayloadShapeOk(validDirectionsPayload(null), DIRECTIONS_REQ_3PTS));
  assert(!directionsPayloadShapeOk(validDirectionsPayload(1), DIRECTIONS_REQ_3PTS));
  const badSegment = validDirectionsPayload(2) as {
    features: { properties: { segments: Record<string, unknown>[] } }[];
  };
  badSegment.features[0].properties.segments[0].duration = Number.NaN;
  assert(!directionsPayloadShapeOk(badSegment, DIRECTIONS_REQ_3PTS));
  // 2 points demandés : les segments ne sont pas exigés par le parseur client.
  assert(directionsPayloadShapeOk(validDirectionsPayload(), DIRECTIONS_REQ_2PTS));
});

Deno.test('forme Matrix : durations ET distances, dimensions exactes, cellules number|null', () => {
  const ok = { durations: [[100, 200]], distances: [[120, 220]] };
  assert(matrixPayloadShapeOk(ok, MATRIX_REQ_1x2));
  // `null` = paire non calculable : accepté (le client 3A le gère).
  assert(matrixPayloadShapeOk({ durations: [[100, null]], distances: [[120, null]] }, MATRIX_REQ_1x2));
  // distances manquantes (métrique pourtant demandée).
  assert(!matrixPayloadShapeOk({ durations: [[100, 200]] }, MATRIX_REQ_1x2));
  // Dimensions inexactes (1×1 au lieu de 1×2, ou 2 lignes).
  assert(!matrixPayloadShapeOk({ durations: [[100]], distances: [[120]] }, MATRIX_REQ_1x2));
  assert(
    !matrixPayloadShapeOk(
      { durations: [[100, 200], [1, 2]], distances: [[120, 220], [1, 2]] },
      MATRIX_REQ_1x2,
    ),
  );
  // Cellules invalides : négatif, NaN, chaîne.
  assert(!matrixPayloadShapeOk({ durations: [[-1, 200]], distances: [[120, 220]] }, MATRIX_REQ_1x2));
  assert(!matrixPayloadShapeOk({ durations: [[100, 200]], distances: [[Number.NaN, 220]] }, MATRIX_REQ_1x2));
  assert(!matrixPayloadShapeOk({ durations: [['x', 200]], distances: [[120, 220]] }, MATRIX_REQ_1x2));
  // Structure d'erreur ORS déguisée.
  assert(!matrixPayloadShapeOk({ ...ok, error: { code: 6004 } }, MATRIX_REQ_1x2));
});
