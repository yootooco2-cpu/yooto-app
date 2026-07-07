import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance } from 'react-native';

import { AppearanceService } from '@/services/AppearanceService';

import { brand, colorsFor, type ThemeColors, type ThemeScheme } from './palettes';
import { type ThemeMode } from './themeStorage';

interface ThemeContextValue {
  /** Choix utilisateur : clair / sombre / auto. */
  mode: ThemeMode;
  /** Schéma effectivement appliqué (auto résolu via le système). */
  scheme: ThemeScheme;
  /** Palette sémantique du thème courant. */
  colors: ThemeColors;
  /** Couleurs de marque (constantes entre thèmes). */
  brand: typeof brand;
  /** Change le mode — effet IMMÉDIAT dans toute l'app + persistance. */
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Fournisseur de thème GLOBAL. À placer à la racine (au-dessus des écrans). Résout `auto` via
 * `Appearance` (réglage système) et réagit à ses changements. Le changement de mode est immédiat
 * (état React) et persisté. Toute surface qui lit `useTheme()` bascule sans rechargement.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [systemScheme, setSystemScheme] = useState<ThemeScheme>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );

  // Hydrate le mode persisté (une fois).
  useEffect(() => {
    let active = true;
    void AppearanceService.getMode().then((stored) => {
      if (active && stored) setModeState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  // Suit le réglage système (utile pour `auto`).
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    void AppearanceService.setMode(next);
  };

  const scheme: ThemeScheme = mode === 'auto' ? systemScheme : mode;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, colors: colorsFor(scheme), brand, setMode }),
    [mode, scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Accès au thème courant. Doit être appelé sous `<ThemeProvider>`. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>.');
  return ctx;
}
