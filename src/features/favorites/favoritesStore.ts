import { create } from 'zustand';

/**
 * Favoris — commerces enregistrés par l'utilisateur (source de vérité UNIQUE).
 * V1 : en mémoire de session (aucune persistance inventée) ; l'API du store est prête pour
 * un backend/stockage ultérieur sans changer les appelants. Écrit à un seul endroit (toggle),
 * lu partout (fiche, carte, sheet Favoris).
 */
interface FavoritesState {
  /** Ids des commerces favoris, ordre le plus récent d'abord. */
  ids: string[];
  toggle: (id: string) => void;
  remove: (id: string) => void;
}

export const useFavoritesStore = create<FavoritesState>((set) => ({
  ids: [],
  toggle: (id) =>
    set((s) => ({ ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [id, ...s.ids] })),
  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
}));

/** Sélecteur réactif : ce commerce est-il favori ? */
export const useIsFavorite = (id: string): boolean =>
  useFavoritesStore((s) => s.ids.includes(id));

/** Sélecteur réactif : liste ordonnée des ids favoris. */
export const useFavoriteIds = (): string[] => useFavoritesStore((s) => s.ids);
