import { loadSettings, saveSettings } from '@/features/settings/settingsStorage';
import type { AppSettings } from '@/features/settings/types';

/**
 * Service de RÉGLAGES — persistance de l'objet `AppSettings` (notifications + carte).
 * Unique point d'accès au stockage des réglages (le `SettingsProvider` délègue ici).
 */
export const SettingsService = {
  load(): Promise<AppSettings> {
    return loadSettings();
  },
  save(settings: AppSettings): Promise<void> {
    return saveSettings(settings);
  },
};
