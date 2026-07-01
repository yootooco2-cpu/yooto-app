import { createMemoryStorage } from './memoryStorage';
import type { PreferenceStorage } from './types';

/** Web : mémoire uniquement (jamais de MMKV côté web). */
export function createDefaultStorage(): PreferenceStorage {
  return createMemoryStorage();
}
