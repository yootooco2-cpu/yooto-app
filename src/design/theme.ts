import { colors } from './tokens/colors';
import { radii } from './tokens/radii';
import { shadows } from './tokens/shadows';
import { spacing } from './tokens/spacing';
import { fontSizes, fontWeights, typography } from './tokens/typography';

/**
 * Point d'entrée unique du design system YOOTOO.
 * Agrège tous les tokens pour un import simple : `import { theme } from '@/design/theme'`.
 */
export const theme = {
  colors,
  spacing,
  radii,
  shadows,
  typography,
  fontSizes,
  fontWeights,
} as const;

export type Theme = typeof theme;

export { colors, spacing, radii, shadows, typography, fontSizes, fontWeights };
export type { TypographyVariant } from './tokens/typography';
export type { Radius } from './tokens/radii';
export type { ShadowLevel } from './tokens/shadows';
