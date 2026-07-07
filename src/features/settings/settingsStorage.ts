import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { mergeSettings, type AppSettings } from './types';

const KEY = 'yootoo.settings.v1';

/** Persistance des réglages — localStorage (web) / expo-secure-store (natif). Non bloquant. */
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw =
      Platform.OS === 'web'
        ? (globalThis as { localStorage?: Storage }).localStorage?.getItem(KEY) ?? null
        : await SecureStore.getItemAsync(KEY);
    return mergeSettings(raw ? (JSON.parse(raw) as Partial<AppSettings>) : null);
  } catch {
    return mergeSettings(null);
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    const raw = JSON.stringify(settings);
    if (Platform.OS === 'web') {
      (globalThis as { localStorage?: Storage }).localStorage?.setItem(KEY, raw);
      return;
    }
    await SecureStore.setItemAsync(KEY, raw);
  } catch {
    /* stockage indisponible : les réglages restent en mémoire pour la session. */
  }
}
