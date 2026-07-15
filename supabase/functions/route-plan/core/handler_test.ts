/**
 * Tests du pipeline complet `handleRoutePlan` (dont politique de logs) :
 * chemins nominaux, CORS, auth, quotas, amont, et preuve qu'aucune donnée
 * sensible n'atteint les logs. Hors ligne, dépendances injectées.
 */

import { assert, assertEquals, assertNotContains } from './asserts.ts';
import type { RawHttpRequest } from './contracts.ts';
import { PILOT_ZONE_MONTPELLIER_V1 } from './geofence.ts';
import { SERVER_ROUTING_CONFIG_V1 } from './canonicalConfig.ts';
import { createMemoryQuotaStore } from './quota.ts';
import type { SafeLogEntry } from './logging.ts';
import type { HandlerDeps } from './handler.ts';
import { handleRoutePlan } from './handler.ts';

const NOW = Date.UTC(2026, 6, 15, 10, 0, 0);
const ORIGIN_POINT = { latitude: 43.6086, longitude: 3.8797 };
const DESTINATION_POINT = { latitude: 43.6128, longitude: 3.8655 };

const DIRECTIONS_BODY = {
  action: 'directions',
  mode: 'wheelchair',
  expectedBinding: { providerId: 'ors', profileId: 'wheelchair', routingConfigVersion: 1 },
  origin: ORIGIN_POINT,
  destination: DESTINATION_POINT,
  waypoint: { latitude: 43.61, longitude: 3.874 },
};

const MATRIX_BODY = {
  action: 'matrix',
  mode: 'walk',
  expectedBinding: { providerId: 'ors', profileId: 'foot-walking', routingConfigVersion: 1 },
  origin: ORIGIN_POINT,
  destination: DESTINATION_POINT,
  candidates: [{ latitude: 43.6105, longitude: 3.8748 }],
};

function fakeHmacHex64(secret: string, message: string): Promise<string> {
  let hash = 0x811c9dc5;
  const input = `${secret}::${message}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return Promise.resolve(hash.toString(16).padStart(8, '0').repeat(8));
}

interface TestHarness {
  deps: HandlerDeps;
  logs: SafeLogEntry[];
  upstreamUrls: string[];
  jwtCalls: number;
}

function makeHarness(overrides: Partial<HandlerDeps> = {}): TestHarness {
  const logs: SafeLogEntry[] = [];
  const upstreamUrls: string[] = [];
  const harness: TestHarness = {
    logs,
    upstreamUrls,
    jwtCalls: 0,
    deps: {
      jwtVerifier: (header) => {
        harness.jwtCalls += 1;
        return Promise.resolve(
          header === 'Bearer jwt-de-test-valide'
            ? { ok: true, sub: 'sub-secret-abc' }
            : { ok: false, reason: header === null ? 'missing' : 'invalid' },
        );
      },
      hmacFn: fakeHmacHex64,
      pepper: 'pepper-de-test',
      quotaStore: createMemoryQuotaStore(),
      quotaLimits: { perUserDaily: 100, globalDaily: 1000, perUserPerMinute: 50 },
      upstream: {
        fetchFn: (url, init) => {
          upstreamUrls.push(url);
          const requestBody = JSON.parse(init.body) as Record<string, unknown>;
          if (url.includes('/matrix/')) {
            // Grilles aux dimensions EXACTES des sources × destinations demandées.
            const rows = (requestBody.sources as unknown[]).length;
            const cols = (requestBody.destinations as unknown[]).length;
            const grid = () =>
              Array.from({ length: rows }, () => Array.from({ length: cols }, () => 100));
            return Promise.resolve({
              status: 200,
              json: () => Promise.resolve({ durations: grid(), distances: grid() }),
            });
          }
          // Directions : geometry + summary + segments (un par tronçon demandé).
          const pointCount = (requestBody.coordinates as unknown[]).length;
          const payload = {
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
                  ...(pointCount >= 3
                    ? {
                        segments: Array.from({ length: pointCount - 1 }, () => ({
                          duration: 700,
                          distance: 800,
                        })),
                      }
                    : {}),
                },
              },
            ],
          };
          return Promise.resolve({ status: 200, json: () => Promise.resolve(payload) });
        },
        apiKeyProvider: () => 'cle-factice-test',
      },
      hashFn: (input) => fakeHmacHex64('hash', input),
      nowMs: () => NOW,
      requestIdProvider: () => 'req-serveur-001',
      logSink: (entry) => logs.push(entry),
      allowedOrigins: ['https://app.yootoo.example'],
      config: SERVER_ROUTING_CONFIG_V1,
      limits: { maxBodyBytes: 10_240, maxMatrixCandidates: 20 },
      pilotZone: PILOT_ZONE_MONTPELLIER_V1,
      ...overrides,
    },
  };
  return harness;
}

function post(body: unknown, overrides: Partial<RawHttpRequest> = {}): RawHttpRequest {
  return {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer jwt-de-test-valide',
    },
    bodyText: JSON.stringify(body),
    origin: null,
    ...overrides,
  };
}

Deno.test('directions fauteuil : enveloppe avec assertion serveur complète', async () => {
  const harness = makeHarness();
  const response = await handleRoutePlan(post(DIRECTIONS_BODY), harness.deps);
  assertEquals(response.status, 200);
  const envelope = JSON.parse(response.body);
  assert(envelope.ok);
  assertEquals(envelope.assertion.providerId, 'ors');
  assertEquals(envelope.assertion.profileId, 'wheelchair');
  assertEquals(envelope.assertion.serverConfigVersion, 1);
  assertEquals(envelope.assertion.generatedAtMs, NOW);
  assert(typeof envelope.assertion.paramsHash === 'string' && envelope.assertion.paramsHash.length >= 32);
  assert(envelope.payload.type === 'FeatureCollection');
  assertEquals(harness.upstreamUrls.length, 1);
  assert(harness.upstreamUrls[0].includes('/v2/directions/wheelchair/geojson'));
});

Deno.test('matrix marche : deux appels amont, payloadA et payloadB distincts', async () => {
  const harness = makeHarness();
  const response = await handleRoutePlan(post(MATRIX_BODY), harness.deps);
  assertEquals(response.status, 200);
  const envelope = JSON.parse(response.body);
  assert(envelope.ok);
  assert(envelope.payloadA.durations !== undefined);
  assert(envelope.payloadB.durations !== undefined);
  assertEquals(harness.upstreamUrls.length, 2);
  assert(harness.upstreamUrls.every((url) => url.includes('/v2/matrix/foot-walking')));
});

Deno.test('préflight OPTIONS : sans JWT, en-têtes limités, jamais *', async () => {
  const harness = makeHarness();
  const response = await handleRoutePlan(
    { method: 'OPTIONS', headers: {}, bodyText: '', origin: 'https://app.yootoo.example' },
    harness.deps,
  );
  assertEquals(response.status, 204);
  assertEquals(harness.jwtCalls, 0);
  assertEquals(response.headers['access-control-allow-origin'], 'https://app.yootoo.example');
  assertEquals(response.headers['access-control-allow-headers'], 'authorization, content-type');
  assert(!Object.values(response.headers).includes('*'));
});

Deno.test('origine non listée refusée ; origine absente acceptée (app native)', async () => {
  const harness = makeHarness();
  const badOrigin = await handleRoutePlan(
    post(DIRECTIONS_BODY, { origin: 'https://mechant.example' }),
    harness.deps,
  );
  assertEquals(badOrigin.status, 403);
  assertEquals(JSON.parse(badOrigin.body).error, 'origin_not_allowed');
  // Aucun écho de l'origine non validée.
  assert(badOrigin.headers['access-control-allow-origin'] === undefined);

  const noOrigin = await handleRoutePlan(post(DIRECTIONS_BODY), harness.deps);
  assertEquals(noOrigin.status, 200);
});

Deno.test('sans JWT valide → 401', async () => {
  const harness = makeHarness();
  const missing = await handleRoutePlan(
    post(DIRECTIONS_BODY, { headers: { 'content-type': 'application/json' } }),
    harness.deps,
  );
  assertEquals(missing.status, 401);
  assertEquals(JSON.parse(missing.body).error, 'unauthorized');
});

Deno.test('quotas : dépassement utilisateur/jour → 429 typé, amont jamais appelé', async () => {
  const harness = makeHarness({
    quotaLimits: { perUserDaily: 1, globalDaily: 1000, perUserPerMinute: 50 },
  });
  const first = await handleRoutePlan(post(DIRECTIONS_BODY), harness.deps);
  assertEquals(first.status, 200);
  const second = await handleRoutePlan(post(DIRECTIONS_BODY), harness.deps);
  assertEquals(second.status, 429);
  assertEquals(JSON.parse(second.body).error, 'quota_exceeded_user');
  assertEquals(harness.upstreamUrls.length, 1);
});

Deno.test('amont 429 → upstream_rate_limited distinct', async () => {
  const harness = makeHarness({
    upstream: {
      fetchFn: () => Promise.resolve({ status: 429, json: () => Promise.resolve({}) }),
      apiKeyProvider: () => 'k',
    },
  });
  const response = await handleRoutePlan(post(DIRECTIONS_BODY), harness.deps);
  assertEquals(response.status, 429);
  assertEquals(JSON.parse(response.body).error, 'upstream_rate_limited');
});

Deno.test('validation en échec → erreur typée sans coordonnées', async () => {
  const harness = makeHarness();
  const response = await handleRoutePlan(
    post({ ...DIRECTIONS_BODY, origin: { latitude: 48.85, longitude: 2.35 } }),
    harness.deps,
  );
  assertEquals(response.status, 400);
  assertEquals(JSON.parse(response.body).error, 'out_of_pilot_area');
  assertNotContains(response.body, '48.85');
  assertNotContains(response.body, '43.6');
});

Deno.test('LOGS : jamais de JWT, sub, pseudonyme, coordonnées ou corps', async () => {
  const harness = makeHarness();
  await handleRoutePlan(post(DIRECTIONS_BODY), harness.deps);
  await handleRoutePlan(post(MATRIX_BODY), harness.deps);
  await handleRoutePlan(
    post(DIRECTIONS_BODY, { headers: { 'content-type': 'application/json' } }),
    harness.deps,
  ); // 401
  await handleRoutePlan(
    { method: 'OPTIONS', headers: {}, bodyText: '', origin: 'https://app.yootoo.example' },
    harness.deps,
  );

  assert(harness.logs.length === 4);
  const serialized = JSON.stringify(harness.logs);
  for (const forbidden of [
    'jwt-de-test-valide',
    'sub-secret-abc',
    '43.6',
    '3.87',
    'latitude',
    'cle-factice-test',
    'pepper-de-test',
  ]) {
    assertNotContains(serialized, forbidden);
  }
  // Le pseudonyme complet (64 hex) n'apparaît pas non plus.
  const pseudonym = await fakeHmacHex64('pepper-de-test', 'sub-secret-abc');
  assertNotContains(serialized, pseudonym);
  // Le requestId est celui GÉNÉRÉ SERVEUR, et les statuts sont journalisés.
  assertEquals(harness.logs[0].requestId, 'req-serveur-001');
  assertEquals(harness.logs[0].statusCode, 200);
  assertEquals(harness.logs[2].errorCode, 'unauthorized');
  assertEquals(harness.logs[1].upstreamCalls, 2);
});

Deno.test('un requestId client éventuel est ignoré (jamais recopié dans les logs)', async () => {
  const harness = makeHarness();
  await handleRoutePlan(
    post(DIRECTIONS_BODY, {
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer jwt-de-test-valide',
        'x-request-id': 'id-client-forge',
      },
    }),
    harness.deps,
  );
  const serialized = JSON.stringify(harness.logs);
  assertNotContains(serialized, 'id-client-forge');
  assertEquals(harness.logs[0].requestId, 'req-serveur-001');
});

Deno.test('déterminisme : deux exécutions identiques produisent la même réponse', async () => {
  const a = await handleRoutePlan(post(DIRECTIONS_BODY), makeHarness().deps);
  const b = await handleRoutePlan(post(DIRECTIONS_BODY), makeHarness().deps);
  assertEquals(a, b);
});
