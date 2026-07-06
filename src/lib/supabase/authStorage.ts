import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Stockage de session pour Supabase Auth.
 *  - Web : `localStorage` (SSR-safe, garde-fou `window`).
 *  - Natif : `expo-secure-store` (Keychain / Keystore) — jamais AsyncStorage pour des tokens.
 *
 * SecureStore plafonne ~2 Ko par clé ; une session (access + refresh + user) peut dépasser →
 * on DÉCOUPE en fragments. Réassemblage transparent. Clés dérivées sûres (`__n`, `__i`).
 */
const isWeb = Platform.OS === 'web';
const CHUNK = 1800;

async function nativeGet(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(`${key}__n`);
  if (countRaw == null) return null;
  const count = Number(countRaw);
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    parts.push((await SecureStore.getItemAsync(`${key}__${i}`)) ?? '');
  }
  return parts.join('');
}

async function nativeSet(key: string, value: string): Promise<void> {
  // purge d'un éventuel ancien découpage plus long
  const prev = await SecureStore.getItemAsync(`${key}__n`);
  const prevCount = prev == null ? 0 : Number(prev);
  const count = Math.max(1, Math.ceil(value.length / CHUNK));
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(`${key}__${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
  }
  for (let i = count; i < prevCount; i++) await SecureStore.deleteItemAsync(`${key}__${i}`);
  await SecureStore.setItemAsync(`${key}__n`, String(count));
}

async function nativeRemove(key: string): Promise<void> {
  const countRaw = await SecureStore.getItemAsync(`${key}__n`);
  const count = countRaw == null ? 0 : Number(countRaw);
  for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${key}__${i}`);
  await SecureStore.deleteItemAsync(`${key}__n`);
}

export const authStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    return nativeGet(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return;
    }
    await nativeSet(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return;
    }
    await nativeRemove(key);
  },
};
