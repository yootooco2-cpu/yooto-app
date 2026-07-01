import { applyEvent, createEmptyProfile, deriveSnapshot, parseStoredProfile } from './profile';
import { getPreferenceStorage } from './storage';
import type { PreferenceEvent, PreferenceProfile, PreferenceSnapshot } from './types';

const STORAGE_KEY = 'yootoo.preferences';

function load(): PreferenceProfile {
  try {
    const raw = getPreferenceStorage().getString(STORAGE_KEY);
    return raw ? parseStoredProfile(raw) : createEmptyProfile();
  } catch {
    return createEmptyProfile();
  }
}

function persist(profile: PreferenceProfile): void {
  try {
    getPreferenceStorage().set(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // best-effort
  }
}

let profile = load();
let snapshot: PreferenceSnapshot = deriveSnapshot(profile);
const listeners = new Set<() => void>();

/** Enregistre un comportement → met à jour le profil (incrémental) + notifie. */
export function trackEvent(event: PreferenceEvent): void {
  const next = applyEvent(profile, event);
  if (next === profile) return;
  profile = next;
  persist(profile);
  snapshot = deriveSnapshot(profile);
  listeners.forEach((l) => l());
}

/** Snapshot stable (même référence tant qu'aucun changement) → useSyncExternalStore. */
export function getPreferenceSnapshot(): PreferenceSnapshot {
  return snapshot;
}

export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Vie privée : réinitialiser toutes les préférences locales. */
export function resetPreferences(): void {
  profile = createEmptyProfile();
  persist(profile);
  snapshot = deriveSnapshot(profile);
  listeners.forEach((l) => l());
}

/** Vie privée : exporter les préférences (JSON) — pour sauvegarde/sync ultérieure. */
export function exportPreferences(): string {
  return JSON.stringify(profile);
}
