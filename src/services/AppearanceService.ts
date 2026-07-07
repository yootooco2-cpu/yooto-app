import { loadThemeMode, saveThemeMode, type ThemeMode } from '@/design/theme/themeStorage';

/**
 * Service d'APPARENCE — unique point d'accès à la persistance du thème (clair/sombre/auto).
 * Les composants/`ThemeProvider` passent par ici (jamais le stockage brut directement).
 */
export const AppearanceService = {
  getMode(): Promise<ThemeMode | null> {
    return loadThemeMode();
  },
  setMode(mode: ThemeMode): Promise<void> {
    return saveThemeMode(mode);
  },
};

export type { ThemeMode };
