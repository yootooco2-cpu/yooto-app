import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import {
  deriveLaunchStatus,
  LAUNCH_SEEN_KEY,
  milestoneKey,
  readBoolFlag,
  type LaunchStatus,
} from './launchLogic';

/**
 * FONDATION TRANSVERSE B — store d'orchestration (persisté sur disque).
 *
 * GÉNÉRIQUE et parcours-AGNOSTIQUE : il pilote un statut de lancement + des *milestones*
 * arbitraires (aucun « onboarding » ni « auth » baked-in). NON CÂBLÉ aujourd'hui → zéro
 * changement de comportement. Persistance légère : `expo-secure-store` (natif) /
 * `localStorage` (web), garde-fous SSR/erreurs (jamais bloquant).
 */
const isWeb = Platform.OS === 'web';

async function getFlag(key: string): Promise<boolean> {
  try {
    if (isWeb) {
      return typeof window !== 'undefined' ? readBoolFlag(window.localStorage.getItem(key)) : false;
    }
    return readBoolFlag(await SecureStore.getItemAsync(key));
  } catch {
    return false;
  }
}

async function setFlag(key: string): Promise<void> {
  try {
    if (isWeb) {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, 'true');
      return;
    }
    await SecureStore.setItemAsync(key, 'true');
  } catch {
    /* non bloquant */
  }
}

interface LaunchState {
  status: LaunchStatus;
  hydrated: boolean;
  /** Cache des milestones déjà résolus (nom → vu). */
  milestones: Record<string, boolean>;
  /** Lit le drapeau de lancement (idempotent). */
  hydrate: () => Promise<void>;
  /** Mémorise que l'app a déjà été lancée (le prochain démarrage sera « returning »). */
  markLaunched: () => Promise<void>;
  /** Résout (et met en cache) l'état d'un *milestone* générique. */
  checkMilestone: (name: string) => Promise<boolean>;
  /** Marque un *milestone* comme atteint (ex. `onboarding`, `whatsnew-2`). */
  markMilestone: (name: string) => Promise<void>;
}

export const useLaunchStore = create<LaunchState>((set, get) => ({
  status: 'unknown',
  hydrated: false,
  milestones: {},
  hydrate: async () => {
    if (get().hydrated) return;
    const seen = await getFlag(LAUNCH_SEEN_KEY);
    set({ status: deriveLaunchStatus(seen), hydrated: true });
  },
  markLaunched: async () => {
    await setFlag(LAUNCH_SEEN_KEY);
  },
  checkMilestone: async (name) => {
    const cached = get().milestones[name];
    if (cached !== undefined) return cached;
    const value = await getFlag(milestoneKey(name));
    set((s) => ({ milestones: { ...s.milestones, [name]: value } }));
    return value;
  },
  markMilestone: async (name) => {
    await setFlag(milestoneKey(name));
    set((s) => ({ milestones: { ...s.milestones, [name]: true } }));
  },
}));
