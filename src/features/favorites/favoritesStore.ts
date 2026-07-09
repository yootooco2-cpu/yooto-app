import { create } from 'zustand';

import { ensureIdentity } from '@/features/auth/ensureIdentity';

import { pullFavorites, pushFavorite } from './favoritesSource';
import { loadLocalFavorites, saveLocalFavorites } from './favoritesStorage';
import { mergeFavoriteIds } from './favoritesSync';

/**
 * Favoris — source de vérité UNIQUE, LOCAL-FIRST + synchro serveur (User Data Store, ADR-001).
 *
 * L'API publique (`toggle`, `remove`, `useIsFavorite`, `useFavoriteIds`) est INCHANGÉE : les
 * appelants (fiche, carte, sheet) ne bougent pas. En interne :
 *  - écriture OPTIMISTE immédiate (UI instantanée) + persistance disque (survit au kill) ;
 *  - `ensureIdentity()` matérialise l'anonyme au 1er favori, puis `pushFavorite` (LWW serveur) ;
 *  - `hydrate()` fusionne disque + serveur (union, idempotent) → convergence, zéro perte ;
 *  - Supabase indisponible/offline → reste en local (fallback), réconcilie au prochain `hydrate`.
 */
interface FavoritesState {
  /** Ids des commerces favoris, ordre le plus récent d'abord. */
  ids: string[];
  hydrated: boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  /** Écrit l'état favori en LOCAL uniquement (optimiste), SANS synchro serveur — l'appelant
   *  gère lui-même la persistance serveur + le rollback (ex. fiche commerce). */
  setFavoriteLocal: (id: string, active: boolean) => void;
  /** Charge le disque (toujours sûr, sans réseau). */
  hydrate: () => Promise<void>;
  /** Fusionne l'état serveur (à n'appeler QUE quand une session existe). */
  syncServer: () => Promise<void>;
}

/** Écrit un favori serveur (best-effort) : matérialise l'identité puis pousse (LWW). */
async function syncOne(id: string, active: boolean): Promise<void> {
  const ready = await ensureIdentity();
  if (ready) await pushFavorite(id, active);
  // Sinon : reste en local ; sera réconcilié au prochain hydrate.
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: [],
  hydrated: false,

  toggle: (id) => {
    const willBeActive = !get().ids.includes(id);
    set((s) => ({ ids: willBeActive ? [id, ...s.ids] : s.ids.filter((x) => x !== id) }));
    void saveLocalFavorites(get().ids);
    void syncOne(id, willBeActive);
  },

  remove: (id) => {
    if (!get().ids.includes(id)) return;
    set((s) => ({ ids: s.ids.filter((x) => x !== id) }));
    void saveLocalFavorites(get().ids);
    void syncOne(id, false);
  },

  setFavoriteLocal: (id, active) => {
    set((s) => ({
      ids: active ? (s.ids.includes(id) ? s.ids : [id, ...s.ids]) : s.ids.filter((x) => x !== id),
    }));
    void saveLocalFavorites(get().ids);
  },

  hydrate: async () => {
    // Disque uniquement (aucun réseau) → l'UI récupère les favoris hors ligne / avant session.
    const local = await loadLocalFavorites();
    set((s) => ({ ids: mergeFavoriteIds(s.ids, local), hydrated: true }));
  },

  syncServer: async () => {
    // Appelé UNIQUEMENT quand une session existe → convergence (union, idempotent).
    const remote = await pullFavorites();
    if (!remote) return;
    const merged = mergeFavoriteIds(get().ids, remote);
    set({ ids: merged });
    void saveLocalFavorites(merged);
  },
}));

/** Sélecteur réactif : ce commerce est-il favori ? */
export const useIsFavorite = (id: string): boolean =>
  useFavoritesStore((s) => s.ids.includes(id));

/** Sélecteur réactif : liste ordonnée des ids favoris. */
export const useFavoriteIds = (): string[] => useFavoritesStore((s) => s.ids);
