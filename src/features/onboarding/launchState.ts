import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { deriveLaunchStatus, LAUNCH_KEYS, readBoolFlag, type LaunchStatus } from './launchLogic';

/**
 * FONDATION B — store d'orchestration du 1er lancement (persisté sur disque).
 *
 * NON CÂBLÉ : aucun écran ne le consomme pour l'instant → aucun changement de comportement.
 * Il fournit seulement la couture (statut + drapeaux + hydratation) que la stratégie d'entrée
 * VALIDÉE utilisera (bienvenue une fois / auth juste-à-temps / etc.). Persistance légère :
 * `expo-secure-store` (natif) / `localStorage` (web), garde-fous SSR/erreurs.
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
    /* non bloquant : au pire on re-propose l'onboarding, jamais de crash */
  }
}

interface LaunchState {
  status: LaunchStatus;
  onboardingCompleted: boolean;
  hydrated: boolean;
  /** Lit les drapeaux persistés (idempotent). */
  hydrate: () => Promise<void>;
  /** Mémorise que l'app a déjà été lancée (le prochain démarrage sera « returning »). */
  markLaunched: () => Promise<void>;
  /** Mémorise que l'onboarding est terminé. */
  completeOnboarding: () => Promise<void>;
}

export const useLaunchStore = create<LaunchState>((set, get) => ({
  status: 'unknown',
  onboardingCompleted: false,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const [seen, onboarded] = await Promise.all([
      getFlag(LAUNCH_KEYS.seen),
      getFlag(LAUNCH_KEYS.onboarded),
    ]);
    set({ status: deriveLaunchStatus(seen), onboardingCompleted: onboarded, hydrated: true });
  },
  markLaunched: async () => {
    await setFlag(LAUNCH_KEYS.seen);
  },
  completeOnboarding: async () => {
    await setFlag(LAUNCH_KEYS.onboarded);
    set({ onboardingCompleted: true });
  },
}));
