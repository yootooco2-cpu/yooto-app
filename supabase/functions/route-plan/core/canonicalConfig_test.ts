/**
 * Tests du JSON canonique et de l'empreinte de configuration.
 */

import { assert, assertEquals, assertNotContains } from './asserts.ts';
import {
  canonicalJson,
  computeParamsHash,
  paramsHashMaterial,
  SERVER_ROUTING_CONFIG_V1,
} from './canonicalConfig.ts';

/** Hachage local déterministe (FNV-1a 32 bits, répété) — test uniquement. */
async function fakeHash(input: string): Promise<string> {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, '0');
  return await Promise.resolve(hex.repeat(8));
}

Deno.test('canonicalJson : clés triées récursivement, ordre d’insertion indifférent', () => {
  const a = { b: 1, a: { z: [1, { y: 2, x: 3 }], k: 'v' } };
  const b = { a: { k: 'v', z: [1, { x: 3, y: 2 }] }, b: 1 };
  assertEquals(canonicalJson(a), canonicalJson(b));
  assertEquals(canonicalJson({ n: null, s: 'é' }), '{"n":null,"s":"é"}');
});

Deno.test('paramsHash : déterministe, sensible aux restrictions, différent par profil', async () => {
  const wheelchair1 = await computeParamsHash(SERVER_ROUTING_CONFIG_V1, 'wheelchair', fakeHash);
  const wheelchair2 = await computeParamsHash(SERVER_ROUTING_CONFIG_V1, 'wheelchair', fakeHash);
  const walk = await computeParamsHash(SERVER_ROUTING_CONFIG_V1, 'walk', fakeHash);
  assertEquals(wheelchair1, wheelchair2);
  assert(wheelchair1 !== walk, 'profils différents → empreintes différentes');

  const altered = {
    ...SERVER_ROUTING_CONFIG_V1,
    wheelchairRestrictions: {
      ...SERVER_ROUTING_CONFIG_V1.wheelchairRestrictions,
      maximum_incline: 3 as const,
    },
  };
  const alteredHash = await computeParamsHash(altered, 'wheelchair', fakeHash);
  assert(alteredHash !== wheelchair1, 'restriction modifiée → empreinte différente');
});

Deno.test('le matériau de l’empreinte exclut coordonnées, identités et horodatages', () => {
  const material = paramsHashMaterial(SERVER_ROUTING_CONFIG_V1, 'wheelchair');
  for (const forbidden of ['latitude', 'longitude', 'sub', 'jwt', 'pseudonym', 'requestId', 'generatedAt', 'nowMs']) {
    assertNotContains(material, forbidden);
  }
  // Il contient bien le profil et les restrictions réellement appliqués.
  assert(material.includes('"profile":"wheelchair"'));
  assert(material.includes('maximum_incline'));
});
