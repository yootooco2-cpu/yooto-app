export type QuickFilterId = 'nearby' | 'open' | 'producers' | 'accessible' | 'rewards';

export interface QuickFilter {
  id: QuickFilterId;
  label: string;
}

/**
 * Filtres rapides affichés.
 * - « Récompenses » retiré (source partagée, pas de donnée).
 * - « Accessible PMR » désactivé TEMPORAIREMENT : aucune donnée d'accessibilité
 *   fiable en base (pas de colonne dédiée, signature_tags vides). On ne marque
 *   jamais un commerce PMR sans donnée → le chip est masqué tant qu'une source
 *   fiable n'existe pas. La logique `accessible` reste gérée dans matchesFilters.
 */
export const QUICK_FILTERS: QuickFilter[] = [
  { id: 'nearby', label: 'Autour de moi' },
  { id: 'open', label: 'Ouvert maintenant' },
  { id: 'producers', label: 'Producteurs' },
];
