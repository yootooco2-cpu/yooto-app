/**
 * Preference Engine — types. Uniquement des PRÉFÉRENCES (jamais de données
 * personnelles sensibles). Catégories en `string` (domaine-agnostique).
 */

export type PreferenceEventType =
  // Engagement léger (plug-in v2)
  | 'search_used'
  | 'filter_selected'
  | 'category_opened'
  // Consultation / intention
  | 'open_merchant'
  | 'dwell'
  | 'go_there'
  | 'save'
  | 'favorite'
  // Prévu (non implémenté ici) : visite réelle GPS
  | 'visit';

export interface PreferenceEvent {
  type: PreferenceEventType;
  category?: string;
  isProducer?: boolean;
  distanceKm?: number;
  dwellSeconds?: number;
}

/** Profil incrémental (compteurs pondérés — jamais recalculé intégralement). */
export interface PreferenceProfile {
  categoryCounts: Record<string, number>;
  producerCount: number;
  totalInteractions: number;
  /** Horodatage de la dernière mise à jour (base de la décroissance temporelle). */
  updatedAt: number;
  version: number;
}

/** Vue dérivée, prête pour le scoring (valeurs normalisées 0..1). */
export interface PreferenceSnapshot {
  topCategories: string[];
  categoryAffinity: Record<string, number>;
  producerAffinity: number;
  hasData: boolean;
}

/** Contrat de stockage — implémentation injectable (mémoire / MMKV / AsyncStorage). */
export interface PreferenceStorage {
  getString(key: string): string | null;
  set(key: string, value: string): void;
}
