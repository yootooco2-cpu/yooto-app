/**
 * Tests de validation stricte (dont géorestriction pilote).
 * Hors ligne, zéro import externe.
 */

import { assert, assertEquals } from './asserts.ts';
import type { RawHttpRequest } from './contracts.ts';
import { SERVER_ROUTING_CONFIG_V1 } from './canonicalConfig.ts';
import { isInPilotZone, PILOT_ZONE_MONTPELLIER_V1 } from './geofence.ts';
import { isJsonContentType, validateRoutePlanRequest } from './validate.ts';

const LIMITS = { maxBodyBytes: 10_240, maxMatrixCandidates: 20 };
const ORIGIN = { latitude: 43.6086, longitude: 3.8797 };
const DESTINATION = { latitude: 43.6128, longitude: 3.8655 };
const BINDING_WHEELCHAIR = { providerId: 'ors', profileId: 'wheelchair', routingConfigVersion: 1 };
const BINDING_WALK = { providerId: 'ors', profileId: 'foot-walking', routingConfigVersion: 1 };

function rawRequest(body: unknown, overrides: Partial<RawHttpRequest> = {}): RawHttpRequest {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    bodyText: typeof body === 'string' ? body : JSON.stringify(body),
    origin: null,
    ...overrides,
  };
}

function validate(body: unknown, overrides: Partial<RawHttpRequest> = {}) {
  return validateRoutePlanRequest(
    rawRequest(body, overrides),
    SERVER_ROUTING_CONFIG_V1,
    PILOT_ZONE_MONTPELLIER_V1,
    LIMITS,
  );
}

const VALID_DIRECTIONS = {
  action: 'directions',
  mode: 'wheelchair',
  expectedBinding: BINDING_WHEELCHAIR,
  origin: ORIGIN,
  destination: DESTINATION,
  waypoint: { latitude: 43.61, longitude: 3.874 },
};

const VALID_MATRIX = {
  action: 'matrix',
  mode: 'walk',
  expectedBinding: BINDING_WALK,
  origin: ORIGIN,
  destination: DESTINATION,
  candidates: [{ latitude: 43.6105, longitude: 3.8748 }],
};

Deno.test('méthode non POST → method_not_allowed', () => {
  assertEquals(validate(VALID_DIRECTIONS, { method: 'GET' }), {
    ok: false,
    code: 'method_not_allowed',
  });
});

Deno.test('Content-Type : casse et paramètres MIME tolérés, autres types refusés', () => {
  assert(isJsonContentType('application/json'));
  assert(isJsonContentType('Application/JSON'));
  assert(isJsonContentType('application/json; charset=utf-8'));
  assert(isJsonContentType('application/json ; charset=UTF-8'));
  assert(!isJsonContentType('text/plain'));
  assert(!isJsonContentType('application/x-www-form-urlencoded'));
  assert(!isJsonContentType(undefined));
  assertEquals(validate(VALID_DIRECTIONS, { headers: { 'content-type': 'text/plain' } }), {
    ok: false,
    code: 'unsupported_media_type',
  });
  const charsetOk = validate(VALID_DIRECTIONS, {
    headers: { 'content-type': 'Application/Json; Charset=UTF-8' },
  });
  assert(charsetOk.ok);
});

Deno.test('taille : octets UTF-8 réels, pas le nombre de caractères', () => {
  // 4 000 caractères '€' = 12 000 octets UTF-8 > 10 240 (mais 4 000 chars).
  const multibyte = '€'.repeat(4_000);
  const result = validate(VALID_DIRECTIONS, {
    bodyText: JSON.stringify({ note: multibyte }),
  });
  assertEquals(result, { ok: false, code: 'body_too_large' });
  // Le même nombre de caractères ASCII passe la limite de taille.
  const ascii = validate({ ...VALID_DIRECTIONS });
  assert(ascii.ok);
});

Deno.test('JSON invalide → invalid_json', () => {
  assertEquals(validate('{pas du json'), { ok: false, code: 'invalid_json' });
});

Deno.test('champ inconnu refusé RÉCURSIVEMENT à tous les niveaux', () => {
  assertEquals(validate({ ...VALID_DIRECTIONS, extra: 1 }), { ok: false, code: 'unknown_field' });
  assertEquals(
    validate({ ...VALID_DIRECTIONS, expectedBinding: { ...BINDING_WHEELCHAIR, admin: true } }),
    { ok: false, code: 'unknown_field' },
  );
  assertEquals(
    validate({ ...VALID_DIRECTIONS, origin: { ...ORIGIN, altitude: 12 } }),
    { ok: false, code: 'unknown_field' },
  );
  assertEquals(
    validate({
      ...VALID_MATRIX,
      candidates: [{ latitude: 43.61, longitude: 3.87, tag: 'x' }],
    }),
    { ok: false, code: 'unknown_field' },
  );
});

Deno.test('coordonnées invalides et sentinelle {0,0} refusées', () => {
  assertEquals(
    validate({ ...VALID_DIRECTIONS, origin: { latitude: 91, longitude: 3.87 } }),
    { ok: false, code: 'invalid_coordinates' },
  );
  assertEquals(
    validate({ ...VALID_DIRECTIONS, origin: { latitude: 0, longitude: 0 } }),
    { ok: false, code: 'invalid_coordinates' },
  );
});

Deno.test('géorestriction pilote : intérieur accepté, limite incluse, extérieur refusé', () => {
  // Paris est hors de la zone Montpellier (~30 km).
  assertEquals(
    validate({ ...VALID_DIRECTIONS, destination: { latitude: 48.8566, longitude: 2.3522 } }),
    { ok: false, code: 'out_of_pilot_area' },
  );
  // ~29,7 km au nord du centre : dedans ; ~31 km : dehors.
  const inside = { latitude: 43.611 + 29_700 / 111_320, longitude: 3.877 };
  const outside = { latitude: 43.611 + 31_000 / 111_320, longitude: 3.877 };
  assert(isInPilotZone(inside, PILOT_ZONE_MONTPELLIER_V1));
  assert(!isInPilotZone(outside, PILOT_ZONE_MONTPELLIER_V1));
});

Deno.test('matrix : plafond de candidats et fauteuil refusé', () => {
  const tooMany = Array.from({ length: 21 }, (_, i) => ({
    latitude: 43.61 + i * 0.0001,
    longitude: 3.87,
  }));
  assertEquals(validate({ ...VALID_MATRIX, candidates: tooMany }), {
    ok: false,
    code: 'too_many_candidates',
  });
  assertEquals(
    validate({ ...VALID_MATRIX, mode: 'wheelchair', expectedBinding: BINDING_WHEELCHAIR }),
    { ok: false, code: 'matrix_capability_incompatible' },
  );
});

Deno.test('binding : fournisseur, profil et version comparés au canonique serveur', () => {
  assertEquals(
    validate({
      ...VALID_DIRECTIONS,
      expectedBinding: { ...BINDING_WHEELCHAIR, providerId: 'mapbox' },
    }),
    { ok: false, code: 'binding_mismatch' },
  );
  // Profil incohérent avec le mode (fauteuil annoncé, profil piéton).
  assertEquals(
    validate({ ...VALID_DIRECTIONS, expectedBinding: BINDING_WALK }),
    { ok: false, code: 'binding_mismatch' },
  );
  assertEquals(
    validate({
      ...VALID_DIRECTIONS,
      expectedBinding: { ...BINDING_WHEELCHAIR, routingConfigVersion: 2 },
    }),
    { ok: false, code: 'binding_mismatch' },
  );
  assertEquals(
    validate({
      ...VALID_DIRECTIONS,
      expectedBinding: { ...BINDING_WHEELCHAIR, profileId: 'driving-car' },
    }),
    { ok: false, code: 'unsupported_profile' },
  );
});

Deno.test('entrées valides acceptées et normalisées', () => {
  const directions = validate(VALID_DIRECTIONS);
  assert(directions.ok);
  if (directions.ok) {
    assertEquals(directions.input.action, 'directions');
    assertEquals(directions.input.mode, 'wheelchair');
  }
  const matrix = validate(VALID_MATRIX);
  assert(matrix.ok);
  if (matrix.ok && matrix.input.action === 'matrix') {
    assertEquals(matrix.input.candidates.length, 1);
  }
});
