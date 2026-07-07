/**
 * Modèle de données des réglages applicatifs (hors thème, géré par `ThemeProvider`).
 * Séparé de l'UI : les écrans ne manipulent que ce modèle typé + ses setters.
 * Extensible : ajouter une clé ici + une ligne dans l'écran suffit.
 */

export interface NotificationSettings {
  promotions: boolean;
  newMerchants: boolean;
  newProducers: boolean;
  seasonal: boolean;
  missions: boolean;
  rewards: boolean;
  localNews: boolean;
}

export type MapQuality = 'standard' | 'high' | 'max';

export interface MapSettings {
  quality: MapQuality;
  buildings3D: boolean;
  animations: boolean;
  showProducers: boolean;
  partnersOnly: boolean;
  showFavorites: boolean;
}

export interface AppSettings {
  notifications: NotificationSettings;
  map: MapSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    promotions: true,
    newMerchants: true,
    newProducers: true,
    seasonal: true,
    missions: false,
    rewards: true,
    localNews: false,
  },
  map: {
    quality: 'high',
    buildings3D: true,
    animations: true,
    showProducers: true,
    partnersOnly: false,
    showFavorites: true,
  },
};

/** Fusionne des réglages partiels (persistés) avec les défauts — tolérant aux clés manquantes. */
export function mergeSettings(partial: Partial<AppSettings> | null | undefined): AppSettings {
  return {
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(partial?.notifications ?? {}) },
    map: { ...DEFAULT_SETTINGS.map, ...(partial?.map ?? {}) },
  };
}
