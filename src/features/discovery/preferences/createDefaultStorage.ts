import { createMemoryStorage } from './memoryStorage';
import type { PreferenceStorage } from './types';

/**
 * Stockage par défaut — BASE (et fallback TypeScript).
 * Metro sélectionne automatiquement :
 *   - `createDefaultStorage.web.ts`    (web  → mémoire)
 *   - `createDefaultStorage.native.ts` (natif → MMKV si dispo, sinon mémoire)
 */
export function createDefaultStorage(): PreferenceStorage {
  return createMemoryStorage();
}
