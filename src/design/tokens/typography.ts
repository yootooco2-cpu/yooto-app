import type { TextStyle } from 'react-native';

/**
 * Échelle typographique YOOTOO.
 * Tons éditoriaux : titres serrés et affirmés (GreenTech premium),
 * corps lisible et aéré, légendes en capitales douces.
 */

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const fontSizes = {
  xs: 12,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 34,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500', letterSpacing: 0.3 },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
