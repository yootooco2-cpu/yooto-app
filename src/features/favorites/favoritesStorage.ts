import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Persistance DISQUE locale des favoris (invariants 1/2/8 : survivre au kill, hors ligne,
 * avant inscription). Web : `localStorage` · Natif : `expo-secure-store`. Blob JSON compact
 * (liste d'ids). Non bloquant : toute erreur → best-effort silencieux (jamais de crash).
 * MVP : clé unique (liste modeste). Hardening ultérieur : découpage si volumineux.
 */
const KEY = 'yootoo.favorites.local.v1';
const isWeb = Platform.OS === 'web';

export async function loadLocalFavorites(): Promise<string[]> {
  try {
    const raw = isWeb
      ? typeof window !== 'undefined'
        ? window.localStorage.getItem(KEY)
        : null
      : await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveLocalFavorites(ids: string[]): Promise<void> {
  try {
    const raw = JSON.stringify(ids);
    if (isWeb) {
      if (typeof window !== 'undefined') window.localStorage.setItem(KEY, raw);
      return;
    }
    await SecureStore.setItemAsync(KEY, raw);
  } catch {
    /* non bloquant */
  }
}
