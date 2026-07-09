/**
 * Palettes de thème YOOTOO (clair / sombre). Mêmes CLÉS SÉMANTIQUES dans les deux thèmes :
 * les composants consomment ces clés via `useTheme()` — jamais de couleur en dur — ce qui rend
 * le mode sombre extensible à toute l'app sans retoucher chaque écran.
 *
 * Les couleurs de MARQUE (vert profond de l'encart impact, lime, etc.) restent constantes entre
 * thèmes (elles sont identiques sur les deux maquettes) — voir `brand`.
 */
export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  /** Surface bouton secondaire au survol (hover web / état actif). */
  surfaceAltHover: string;
  tint: string;
  text: string;
  mutedText: string;
  primary: string;
  /** Bouton principal au survol (hover web). */
  primaryHover: string;
  primaryDark: string;
  onPrimary: string;
  accent: string;
  border: string;
  separator: string;
  success: string;
  warning: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  background: '#F7F4EC',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF8F1',
  surfaceAltHover: '#F1ECDF',
  tint: '#EAF1E1',
  text: '#17201A',
  mutedText: '#6F7A72',
  primary: '#1F7A4D',
  primaryHover: '#25925D',
  primaryDark: '#145A37',
  onPrimary: '#FFFFFF',
  accent: '#D6A85A',
  border: '#E4DDCF',
  separator: '#ECE6D8',
  success: '#2E8B57',
  warning: '#C9822B',
  danger: '#C0392B',
};

/**
 * DA sombre premium YOOTOO — reproduction FIDÈLE de la maquette de référence (7 juil. 2026).
 * Vert naturel désaturé (jamais flashy), fiche vert-noir, cartes un ton au-dessus, étoile or.
 * Fond fiche #111714 · surfaces #18211B · cartes internes #1E2A22 · boutons sec. #1D241F ·
 * hover #263128 · texte #F3F0E8 / secondaire #B7B9B2 · accent vert #6A9B63 / clair #8EB67B ·
 * Ouvert #69B96C · étoile #E7B654 · bordure blanche 8 %.
 */
export const darkColors: ThemeColors = {
  background: '#111714',
  surface: '#18211B',
  surfaceAlt: '#1E2A22',
  surfaceAltHover: '#263128',
  tint: '#18211B',
  text: '#F3F0E8',
  mutedText: '#B7B9B2',
  primary: '#6A9B63',
  primaryHover: '#8EB67B',
  primaryDark: '#365B3B',
  onPrimary: '#0C120E',
  accent: '#E7B654',
  border: 'rgba(255,255,255,0.08)',
  separator: 'rgba(255,255,255,0.06)',
  success: '#69B96C',
  warning: '#E7B654',
  danger: '#E5695B',
};

/** Couleurs de marque constantes entre thèmes (identiques sur les deux maquettes). */
export const brand = {
  greenDeep: '#0F3D28',
  lime: '#A7DE79',
  heart: '#D9645A',
  gold: '#D6A85A',
  blue: '#3E7CB1',
  onDark: '#F3EEE2',
  onDarkMuted: 'rgba(243,238,226,0.72)',
} as const;

export type ThemeScheme = 'light' | 'dark';

export function colorsFor(scheme: ThemeScheme): ThemeColors {
  return scheme === 'dark' ? darkColors : lightColors;
}
