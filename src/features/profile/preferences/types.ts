/** Données prêtes à afficher pour la section Profil → Préférences (vue seule). */
export interface PreferenceSummary {
  favoriteCategories: string[];
  producerAffinity: number;
  prefersProducers: boolean;
  interactionCount: number;
  hasData: boolean;
}
