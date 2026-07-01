import { createDefaultStorage } from './createDefaultStorage';
import type { PreferenceStorage } from './types';

/**
 * Stockage des préférences — 100 % LOCAL, injectable.
 *
 * Par défaut : `createDefaultStorage()` (web → mémoire ; natif → MMKV si dispo,
 * sinon mémoire). Peut être remplacé au démarrage sans toucher au moteur :
 *
 *   import { setPreferenceStorage } from '@/features/discovery';
 *   setPreferenceStorage(monAdaptateur);
 *
 * (Aucune synchronisation distante par défaut — vie privée d'abord.)
 */
let current: PreferenceStorage = createDefaultStorage();

export function setPreferenceStorage(storage: PreferenceStorage): void {
  current = storage;
}

export function getPreferenceStorage(): PreferenceStorage {
  return current;
}
