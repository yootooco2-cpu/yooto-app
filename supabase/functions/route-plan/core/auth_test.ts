/**
 * Tests de l'authentification abstraite et du pseudonyme HMAC.
 */

import { assert, assertEquals } from './asserts.ts';
import type { HmacFn } from './auth.ts';
import { MIN_PSEUDONYM_HEX_LENGTH, pseudonymFromSub } from './auth.ts';

/** HMAC factice déterministe ≥ 128 bits — test uniquement, aucun secret réel. */
const fakeHmac: HmacFn = (secret, message) => {
  let hash = 0x811c9dc5;
  const input = `${secret}::${message}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return Promise.resolve(hash.toString(16).padStart(8, '0').repeat(8)); // 64 hex
};

const weakHmac: HmacFn = () => Promise.resolve('abcd1234'); // 8 hex < 32

Deno.test('pseudonyme : déterministe, dépend du sub ET du pepper', async () => {
  const a1 = await pseudonymFromSub('user-a', fakeHmac, 'pepper-test');
  const a2 = await pseudonymFromSub('user-a', fakeHmac, 'pepper-test');
  const b = await pseudonymFromSub('user-b', fakeHmac, 'pepper-test');
  const otherPepper = await pseudonymFromSub('user-a', fakeHmac, 'pepper-autre');
  assert(a1.ok && a2.ok && b.ok && otherPepper.ok);
  if (a1.ok && a2.ok && b.ok && otherPepper.ok) {
    assertEquals(a1.pseudonym, a2.pseudonym);
    assert(a1.pseudonym !== b.pseudonym);
    assert(a1.pseudonym !== otherPepper.pseudonym);
    assert(a1.pseudonym.length >= MIN_PSEUDONYM_HEX_LENGTH);
    // Le pseudonyme ne contient jamais le sub brut.
    assert(!a1.pseudonym.includes('user-a'));
  }
});

Deno.test('une empreinte < 128 bits (32 hex) est refusée', async () => {
  const result = await pseudonymFromSub('user-a', weakHmac, 'pepper-test');
  assertEquals(result, { ok: false, reason: 'pseudonym_too_short' });
});
