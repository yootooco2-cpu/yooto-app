/**
 * Mini-assertions locales pour les tests Deno — ZÉRO import externe :
 * les tests s'exécutent réellement hors ligne, sans téléchargement.
 */

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const recordA = a as Record<string, unknown>;
  const recordB = b as Record<string, unknown>;
  const keysA = Object.keys(recordA);
  const keysB = Object.keys(recordB);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => deepEqual(recordA[key], recordB[key]));
}

export function assert(condition: boolean, message = 'assertion failed'): void {
  if (!condition) throw new Error(message);
}

export function assertEquals(actual: unknown, expected: unknown, message?: string): void {
  if (!deepEqual(actual, expected)) {
    throw new Error(
      message ??
        `assertEquals a échoué\n  reçu:    ${JSON.stringify(actual)}\n  attendu: ${JSON.stringify(expected)}`,
    );
  }
}

export function assertNotContains(haystack: string, needle: string, message?: string): void {
  if (haystack.includes(needle)) {
    throw new Error(message ?? `la chaîne ne devait pas contenir « ${needle} »`);
  }
}
