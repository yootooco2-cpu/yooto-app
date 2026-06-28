export type QuickFilterId = 'nearby' | 'open' | 'producers' | 'accessible' | 'rewards';

export interface QuickFilter {
  id: QuickFilterId;
  label: string;
}

/** Filtres rapides de l'écran Explorer. */
export const QUICK_FILTERS: QuickFilter[] = [
  { id: 'nearby', label: 'Autour de moi' },
  { id: 'open', label: 'Ouvert maintenant' },
  { id: 'producers', label: 'Producteurs' },
  { id: 'accessible', label: 'Accessible PMR' },
  { id: 'rewards', label: 'Récompenses' },
];
