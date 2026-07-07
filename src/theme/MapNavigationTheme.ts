import type { ThemeScheme } from '@/design/theme/palettes';
import { resolveSection } from '@/design/theme/sections';

/**
 * Thème de la navigation verticale flottante posée sur la carte. Verre dépoli SOMBRE translucide
 * (quel que soit le mode, la carte est claire) ; l'icône active reprend la couleur SABLE de
 * l'univers Carte. Indépendant de la Bottom Tab Bar.
 */
export interface MapNavTheme {
  /** Couleur active (sable, univers Carte). */
  accent: string;
  /** Icône/texte posé sur l'accent. */
  onAccent: string;
  /** Icône au repos (sur verre sombre). */
  icon: string;
  /** Petit point indicateur de l'onglet actif. */
  dot: string;
  glass: { tint: string; border: string; highlight: string };
}

export function resolveMapNavTheme(scheme: ThemeScheme): MapNavTheme {
  const carte = resolveSection('carte', scheme); // couleur sable de l'univers Carte
  const isDark = scheme === 'dark';
  return {
    accent: carte.accent,
    onAccent: '#FFF7EA',
    icon: 'rgba(245,240,230,0.88)',
    dot: carte.accentSoft,
    glass: {
      tint: isDark ? 'rgba(14,16,14,0.52)' : 'rgba(28,26,22,0.40)',
      border: 'rgba(255,255,255,0.18)',
      highlight: 'rgba(255,255,255,0.10)',
    },
  };
}
