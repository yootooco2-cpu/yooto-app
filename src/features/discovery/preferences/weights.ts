import type { PreferenceEventType } from './types';

/**
 * Pondération des événements — PLUG-IN.
 * Les signaux d'engagement léger (v2 : recherche, filtre, catégorie ouverte) ont
 * un poids MODÉRÉ : ils affinent sans jamais dominer distance/ouverture/note/
 * producteur (ces derniers sont portés par les signaux du Discovery Engine, pas ici).
 */
const EVENT_WEIGHTS: Record<PreferenceEventType, number> = {
  // Engagement léger (v2)
  search_used: 0.3,
  filter_selected: 0.4,
  category_opened: 0.6,
  // Consultation / intention
  open_merchant: 1,
  dwell: 1,
  go_there: 3,
  save: 4,
  favorite: 5,
  // Prévu (non implémenté)
  visit: 6,
};

export function eventWeight(type: PreferenceEventType): number {
  return EVENT_WEIGHTS[type] ?? 0;
}
