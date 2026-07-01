import type { PreferenceStorage } from './types';

/** Stockage en mémoire — web-safe, aucune dépendance native. */
export function createMemoryStorage(): PreferenceStorage {
  const store = new Map<string, string>();
  return {
    getString: (key) => store.get(key) ?? null,
    set: (key, value) => {
      store.set(key, value);
    },
  };
}
