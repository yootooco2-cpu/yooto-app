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
 * DA sombre premium YOOTOO (anthracite / vert profond). Palette validée : fond #0E1712,
 * surface fiche #121F18, surface bouton #1D2C22 (hover #26382C), primaire #7BC49A / texte #07110B,
 * texte #F4F1E8 / secondaire #AEB8AA, accent or #E2B85E, bordure subtile blanche 10 %.
 */
export const darkColors: ThemeColors = {
  background: '#0E1712',
  surface: '#121F18',
  surfaceAlt: '#1D2C22',
  surfaceAltHover: '#26382C',
  tint: '#172A20',
  text: '#F4F1E8',
  mutedText: '#AEB8AA',
  primary: '#7BC49A',
  primaryHover: '#8FD0AA',
  primaryDark: '#123524',
  onPrimary: '#07110B',
  accent: '#E2B85E',
  border: 'rgba(255,255,255,0.10)',
  separator: 'rgba(255,255,255,0.07)',
  success: '#7BC49A',
  warning: '#E2B85E',
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
