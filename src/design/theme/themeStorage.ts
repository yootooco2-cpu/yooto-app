import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Mode de thème choisi par l'utilisateur. `auto` = suit le réglage système (défaut). */
export type ThemeMode = 'light' | 'dark' | 'auto';

const KEY = 'yootoo.theme.mode.v1';

function isMode(v: unknown): v is ThemeMode {
  return v === 'light' || v === 'dark' || v === 'auto';
}

/** Persistance du mode — localStorage (web) / expo-secure-store (natif). Non bloquant. */
export async function loadThemeMode(): Promise<ThemeMode | null> {
  try {
    if (Platform.OS === 'web') {
      const v = (globalThis as { localStorage?: Storage }).localStorage?.getItem(KEY);
      return isMode(v) ? v : null;
    }
    const v = await SecureStore.getItemAsync(KEY);
    return isMode(v) ? v : null;
  } catch {
    return null;
  }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      (globalThis as { localStorage?: Storage }).localStorage?.setItem(KEY, mode);
      return;
    }
    await SecureStore.setItemAsync(KEY, mode);
  } catch {
    /* stockage indisponible : le mode reste en mémoire pour la session. */
  }
}
