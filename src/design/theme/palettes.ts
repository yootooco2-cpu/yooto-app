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
  tint: string;
  text: string;
  mutedText: string;
  primary: string;
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
  tint: '#EAF1E1',
  text: '#17201A',
  mutedText: '#6F7A72',
  primary: '#1F7A4D',
  primaryDark: '#145A37',
  onPrimary: '#FFFFFF',
  accent: '#D6A85A',
  border: '#E4DDCF',
  separator: '#ECE6D8',
  success: '#2E8B57',
  warning: '#C9822B',
  danger: '#C0392B',
};

export const darkColors: ThemeColors = {
  background: '#0E1512',
  surface: '#18211C',
  surfaceAlt: '#202B25',
  tint: '#172A20',
  text: '#F1ECE0',
  mutedText: '#9AA69E',
  primary: '#5FBF97',
  primaryDark: '#123524',
  onPrimary: '#07120D',
  accent: '#E0B368',
  border: '#2B352E',
  separator: '#232E28',
  success: '#3CB371',
  warning: '#E0A34A',
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
