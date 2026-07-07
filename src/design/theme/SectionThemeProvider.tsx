import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { resolveSection, type SectionKey, type SectionTheme } from './sections';
import { useTheme } from './ThemeProvider';

const SectionThemeContext = createContext<SectionTheme | null>(null);

/**
 * Fournit l'identité visuelle de l'univers courant (Accueil / Carte / Commerçants / De saison /
 * Profil) — au-dessus du thème clair/sombre. À poser autour du contenu de chaque écran d'onglet.
 * Se recalcule automatiquement selon le schéma (clair/sombre) du `ThemeProvider`.
 */
export function SectionThemeProvider({ section, children }: { section: SectionKey; children: ReactNode }) {
  const { scheme } = useTheme();
  const value = useMemo(() => resolveSection(section, scheme), [section, scheme]);
  return <SectionThemeContext.Provider value={value}>{children}</SectionThemeContext.Provider>;
}

/** Identité de l'univers courant. Doit être appelé sous `<SectionThemeProvider>`. */
export function useSectionTheme(): SectionTheme {
  const ctx = useContext(SectionThemeContext);
  if (!ctx) throw new Error('useSectionTheme doit être utilisé dans <SectionThemeProvider>.');
  return ctx;
}
