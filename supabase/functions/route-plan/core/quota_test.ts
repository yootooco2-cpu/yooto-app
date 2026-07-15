/**
 * Tests des quotas atomiques : tout-ou-rien, fenêtres jour/minute,
 * implémentation mémoire test-only.
 */

import { assert, assertEquals } from './asserts.ts';
import {
  buildStandardBuckets,
  createMemoryQuotaStore,
  dayKey,
  minuteKey,
} from './quota.ts';

const NOW = Date.UTC(2026, 6, 15, 10, 0, 0);
const LIMITS = { perUserDaily: 2, globalDaily: 100, perUserPerMinute: 10 };

Deno.test('clés de fenêtres déterministes depuis un epoch injecté', () => {
  assertEquals(dayKey(NOW), '2026-07-15');
  assertEquals(minuteKey(NOW), '2026-07-15T10:00');
  assertEquals(dayKey(NOW + 24 * 3_600_000), '2026-07-16');
  assertEquals(minuteKey(NOW + 60_000), '2026-07-15T10:01');
});

Deno.test('consommation atomique : un refus n’incrémente AUCUN compteur', async () => {
  const store = createMemoryQuotaStore();
  const consume = (pseudonym: string, nowMs: number) =>
    store.consume({
      subjectKey: pseudonym,
      nowMs,
      buckets: buildStandardBuckets(pseudonym, nowMs, LIMITS),
    });

  // 2 requêtes utilisateur A : autorisées (limite user = 2).
  const first = await consume('a'.repeat(64), NOW);
  const second = await consume('a'.repeat(64), NOW + 1_000);
  assert(first.allowed && second.allowed);
  if (second.allowed) {
    assertEquals(second.counts.user_daily, 2);
    assertEquals(second.counts.global_daily, 2);
  }

  // 3e requête : refusée sur user_daily…
  const third = await consume('a'.repeat(64), NOW + 2_000);
  assertEquals(third, { allowed: false, exceededBucket: 'user_daily' });

  // …et le compteur GLOBAL n'a PAS été incrémenté par ce refus :
  // l'utilisateur B voit global_daily = 3 (2 accordées + la sienne), pas 4.
  const other = await consume('b'.repeat(64), NOW + 3_000);
  assert(other.allowed);
  if (other.allowed) {
    assertEquals(other.counts.global_daily, 3);
    assertEquals(other.counts.user_daily, 1);
  }
});

Deno.test('le quota global refuse indépendamment des quotas utilisateur', async () => {
  const store = createMemoryQuotaStore();
  const tight = { perUserDaily: 10, globalDaily: 1, perUserPerMinute: 10 };
  const one = await store.consume({
    subjectKey: 'u1',
    nowMs: NOW,
    buckets: buildStandardBuckets('u'.repeat(64), NOW, tight),
  });
  assert(one.allowed);
  const two = await store.consume({
    subjectKey: 'u2',
    nowMs: NOW,
    buckets: buildStandardBuckets('v'.repeat(64), NOW, tight),
  });
  assertEquals(two, { allowed: false, exceededBucket: 'global_daily' });
});

Deno.test('les fenêtres se réinitialisent : jour suivant et minute suivante', async () => {
  const store = createMemoryQuotaStore();
  const pseudonym = 'c'.repeat(64);
  const perMinute = { perUserDaily: 100, globalDaily: 100, perUserPerMinute: 1 };

  const first = await store.consume({
    subjectKey: pseudonym,
    nowMs: NOW,
    buckets: buildStandardBuckets(pseudonym, NOW, perMinute),
  });
  assert(first.allowed);
  const sameMinute = await store.consume({
    subjectKey: pseudonym,
    nowMs: NOW + 30_000,
    buckets: buildStandardBuckets(pseudonym, NOW + 30_000, perMinute),
  });
  assertEquals(sameMinute, { allowed: false, exceededBucket: 'user_minute' });
  const nextMinute = await store.consume({
    subjectKey: pseudonym,
    nowMs: NOW + 61_000,
    buckets: buildStandardBuckets(pseudonym, NOW + 61_000, perMinute),
  });
  assert(nextMinute.allowed);

  // Jour suivant : le compteur quotidien repart.
  const store2 = createMemoryQuotaStore();
  const daily = { perUserDaily: 1, globalDaily: 100, perUserPerMinute: 10 };
  const d1 = await store2.consume({
    subjectKey: pseudonym,
    nowMs: NOW,
    buckets: buildStandardBuckets(pseudonym, NOW, daily),
  });
  assert(d1.allowed);
  const d2 = await store2.consume({
    subjectKey: pseudonym,
    nowMs: NOW + 24 * 3_600_000,
    buckets: buildStandardBuckets(pseudonym, NOW + 24 * 3_600_000, daily),
  });
  assert(d2.allowed);
});
