import { createMMKV } from 'react-native-mmkv';

import { createMemoryStorage } from './memoryStorage';
import type { PreferenceStorage } from './types';

/**
 * Natif : MMKV (react-native-mmkv v4, basé sur Nitro) si le module natif est
 * disponible (development / EAS build), sinon repli MÉMOIRE.
 *
 * v4 : le constructeur runtime est la factory `createMMKV({ id })` — `MMKV`
 * n'est qu'un type. L'appel est protégé par try/catch → sur Expo Go (sans
 * binding natif Nitro), il échoue proprement et retombe sur la mémoire.
 */
export function createDefaultStorage(): PreferenceStorage {
  try {
    const mmkv = createMMKV({ id: 'yootoo-preferences' });
    return {
      getString: (key) => mmkv.getString(key) ?? null,
      set: (key, value) => {
        mmkv.set(key, value);
      },
    };
  } catch {
    return createMemoryStorage();
  }
}
